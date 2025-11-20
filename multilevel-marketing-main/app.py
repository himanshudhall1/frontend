from flask import Flask, render_template, request, redirect, url_for, flash, session
import sqlite3
from pathlib import Path

APP_DIR = Path(__file__).parent
DB_PATH = APP_DIR / "mlm.db"

app = Flask(__name__)
app.secret_key = "replace_this_with_a_random_secret"

# -------------------------
# Database helpers
# -------------------------
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if DB_PATH.exists():
        return
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_code TEXT UNIQUE,
        name TEXT,
        email TEXT,
        mobile TEXT,
        sponsor_id INTEGER,
        left_member_id INTEGER,
        right_member_id INTEGER,
        left_count INTEGER DEFAULT 0,
        right_count INTEGER DEFAULT 0
    )
    """)
    # seed a root member so new members can join under him/her
    cur.execute("INSERT INTO members (member_code, name, email, mobile) VALUES (?, ?, ?, ?)",
                ("ROOT0001", "Root Member", "root@example.com", "0000000000"))
    conn.commit()
    conn.close()

def generate_member_code(new_id):
    return f"M{new_id:05d}"  # e.g. M00001

def get_member_by_code(member_code):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM members WHERE member_code = ?", (member_code,))
    m = cur.fetchone()
    conn.close()
    return m

def get_member_by_id(mid):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM members WHERE id = ?", (mid,))
    m = cur.fetchone()
    conn.close()
    return m

# -------------------------
# Spill logic and insertion
# -------------------------
def find_spill_parent(sponsor_id, side):
    """
    If sponsor's chosen 'side' is free, return (sponsor_id, side).
    Otherwise traverse down that direction (always choosing the same side) until a node has empty slot.
    Returns (parent_id, side) where new member should be attached as parent's side child.
    """
    conn = get_conn()
    cur = conn.cursor()
    current_id = sponsor_id
    while True:
        cur.execute("SELECT left_member_id, right_member_id FROM members WHERE id = ?", (current_id,))
        row = cur.fetchone()
        if row is None:
            conn.close()
            return None  # sponsor disappeared (shouldn't happen)
        if side.lower() == "left":
            if row["left_member_id"] is None:
                conn.close()
                return (current_id, "left")
            else:
                current_id = row["left_member_id"]
                continue
        else:  # right
            if row["right_member_id"] is None:
                conn.close()
                return (current_id, "right")
            else:
                current_id = row["right_member_id"]
                continue

def attach_new_member(parent_id, side, new_member_id):
    """Set parent's left_member_id or right_member_id to new_member_id."""
    conn = get_conn()
    cur = conn.cursor()
    if side == "left":
        cur.execute("UPDATE members SET left_member_id = ? WHERE id = ?", (new_member_id, parent_id))
    else:
        cur.execute("UPDATE members SET right_member_id = ? WHERE id = ?", (new_member_id, parent_id))
    conn.commit()
    conn.close()

def update_counts_upwards(parent_id, side):
    """
    Starting from parent where new member was attached with 'side',
    walk UP ancestors and increment left_count/right_count appropriately.
    """
    conn = get_conn()
    cur = conn.cursor()
    current_id = parent_id
    current_side = side  # side is relative to current node (child attached as left or right)
    while current_id is not None:
        if current_side == "left":
            cur.execute("UPDATE members SET left_count = left_count + 1 WHERE id = ?", (current_id,))
        else:
            cur.execute("UPDATE members SET right_count = right_count + 1 WHERE id = ?", (current_id,))
        # move up: find current's sponsor and determine whether current is left or right child of sponsor
        cur.execute("SELECT sponsor_id FROM members WHERE id = ?", (current_id,))
        row = cur.fetchone()
        if row is None or row["sponsor_id"] is None:
            break
        sponsor_id = row["sponsor_id"]
        # determine side of current relative to sponsor
        cur.execute("SELECT left_member_id, right_member_id FROM members WHERE id = ?", (sponsor_id,))
        srow = cur.fetchone()
        if srow is None:
            break
        if srow["left_member_id"] == current_id:
            current_side = "left"
        elif srow["right_member_id"] == current_id:
            current_side = "right"
        else:
            # current is not recorded as sponsor's child? break to avoid infinite loop
            break
        current_id = sponsor_id
    conn.commit()
    conn.close()

# -------------------------
# Helpers to create member
# -------------------------
def create_member(name, email, mobile, sponsor_code, requested_side):
    # 1. verify sponsor exists
    sponsor = get_member_by_code(sponsor_code)
    if sponsor is None:
        return (False, "Invalid Sponsor Code.")
    sponsor_id = sponsor["id"]

    # 2. find where to attach using spill logic
    parent_id, side = find_spill_parent(sponsor_id, requested_side.lower())

    if parent_id is None:
        return (False, "Could not find a spot to attach the member (unexpected error).")

    # 3. insert new member row (with sponsor_id)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO members (name, email, mobile, sponsor_id)
        VALUES (?, ?, ?, ?)
    """, (name, email, mobile, parent_id))
    new_id = cur.lastrowid
    member_code = generate_member_code(new_id)
    cur.execute("UPDATE members SET member_code = ? WHERE id = ?", (member_code, new_id))
    conn.commit()
    conn.close()

    # 4. attach to parent and update parent's left/right member reference
    attach_new_member(parent_id, side, new_id)

    # 5. update counts up the tree
    update_counts_upwards(parent_id, side)

    return (True, member_code)

# -------------------------
# Downline helpers
# -------------------------
def get_subtree(member_id, depth=3):
    """Return a nested dict of subtree up to 'depth' levels for display."""
    if depth < 0 or member_id is None:
        return None
    m = get_member_by_id(member_id)
    if m is None:
        return None
    node = {
        "id": m["id"],
        "member_code": m["member_code"],
        "name": m["name"],
        "left_count": m["left_count"],
        "right_count": m["right_count"],
        "left": get_subtree(m["left_member_id"], depth - 1) if m["left_member_id"] else None,
        "right": get_subtree(m["right_member_id"], depth - 1) if m["right_member_id"] else None
    }
    return node

# -------------------------
# Routes
# -------------------------
@app.route("/")
def index():
    return redirect(url_for("join"))

@app.route("/init")
def init():
    init_db()
    flash("Database initialized (if not already). Root member created with code ROOT0001.")
    return redirect(url_for("join"))

@app.route("/join", methods=["GET", "POST"])
def join():
    """
    Member Joining Form:
      - name, email, mobile, sponsor_code, position (Left/Right)
    """
    if request.method == "POST":
        name = request.form.get("name").strip()
        email = request.form.get("email").strip()
        mobile = request.form.get("mobile").strip()
        sponsor_code = request.form.get("sponsor_code").strip()
        position = request.form.get("position").strip().lower()
        if position not in ("left", "right"):
            flash("Invalid position selected. Choose Left or Right.")
            return redirect(url_for("join"))
        ok, info = create_member(name, email, mobile, sponsor_code, position)
        if not ok:
            flash(info)
            return redirect(url_for("join"))
        else:
            new_member_code = info
            flash(f"Member created successfully. Member Code: {new_member_code}. Use Member Code + Mobile to login.")
            return redirect(url_for("join"))
    return render_template("join.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        member_code = request.form.get("member_code").strip()
        mobile = request.form.get("mobile").strip()
        m = get_member_by_code(member_code)
        if m and m["mobile"] == mobile:
            session["member_id"] = m["id"]
            session["member_code"] = m["member_code"]
            flash("Logged in successfully.")
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid credentials.")
            return redirect(url_for("login"))
    return render_template("login.html")

def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "member_id" not in session:
            flash("Please login first.")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out.")
    return redirect(url_for("login"))

@app.route("/dashboard")
@login_required
def dashboard():
    member = get_member_by_id(session["member_id"])
    return render_template("dashboard.html", member=member)

@app.route("/profile")
@login_required
def profile():
    member = get_member_by_id(session["member_id"])
    sponsor = get_member_by_id(member["sponsor_id"]) if member and member["sponsor_id"] else None
    return render_template("profile.html", member=member, sponsor=sponsor)

@app.route("/downline")
@login_required
def downline():
    member = get_member_by_id(session["member_id"])
    # build subtree (limit depth to keep output manageable)
    subtree = get_subtree(member["id"], depth=6)
    return render_template("downline.html", subtree=subtree, member=member)

# small utility to view a member by code (helpful)
@app.route("/member/<code>")
@login_required
def member_view(code):
    m = get_member_by_code(code)
    if not m:
        flash("Member not found.")
        return redirect(url_for("dashboard"))
    subtree = get_subtree(m["id"], depth=4)
    return render_template("downline.html", subtree=subtree, member=m)

# -------------------------
# Start app
# -------------------------
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
