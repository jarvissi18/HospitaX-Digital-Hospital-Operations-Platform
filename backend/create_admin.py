from getpass import getpass

from app.database import SessionLocal
from app.models import User
from app.auth.security import hash_password

# =====================================================
# HOSPITAX - INITIAL ADMINISTRATOR CREATION
# =====================================================


def create_admin():
    db = SessionLocal()

    try:
        print()
        print("=" * 55)
        print("        HospitaX - Administrator Setup")
        print("=" * 55)
        print()

        # -------------------------------------------------
        # ADMIN DETAILS
        # -------------------------------------------------

        employee_id = input("Employee ID: ").strip()
        full_name = input("Full Name: ").strip()
        email = input("Email: ").strip().lower()

        password = getpass("Password: ")
        confirm_password = getpass("Confirm Password: ")

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        if not employee_id:
            print("\nERROR: Employee ID is required.")
            return

        if not full_name:
            print("\nERROR: Full Name is required.")
            return

        if not email:
            print("\nERROR: Email is required.")
            return

        if not password:
            print("\nERROR: Password is required.")
            return

        if password != confirm_password:
            print("\nERROR: Passwords do not match.")
            return

        # -------------------------------------------------
        # CHECK EXISTING EMAIL
        # -------------------------------------------------

        existing_email = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_email:
            print()
            print("ERROR: An account with this email already exists.")
            print(f"Email: {email}")
            return

        # -------------------------------------------------
        # CHECK EXISTING EMPLOYEE ID
        # -------------------------------------------------

        existing_employee = (
            db.query(User)
            .filter(User.employee_id == employee_id)
            .first()
        )

        if existing_employee:
            print()
            print(
                "ERROR: An account with this Employee ID "
                "already exists."
            )
            print(f"Employee ID: {employee_id}")
            return

        # -------------------------------------------------
        # CREATE ADMINISTRATOR
        # -------------------------------------------------

        admin = User(
            employee_id=employee_id,
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role="Administrator",
            is_active="true",
            mobile=None,
            shift=None,
        )

        db.add(admin)

        db.commit()

        db.refresh(admin)

        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        print()
        print("=" * 55)
        print("      Administrator created successfully!")
        print("=" * 55)
        print()
        print(f"Database ID : {admin.id}")
        print(f"Employee ID : {admin.employee_id}")
        print(f"Full Name   : {admin.full_name}")
        print(f"Email       : {admin.email}")
        print(f"Role        : {admin.role}")
        print(f"Active      : {admin.is_active}")
        print()
        print("Password has been securely stored as a bcrypt hash.")
        print()
        print("=" * 55)
        print()

    except Exception as error:
        db.rollback()

        print()
        print("=" * 55)
        print("ERROR: Administrator creation failed.")
        print("=" * 55)
        print()
        print(error)
        print()

    finally:
        db.close()


# =====================================================
# ENTRY POINT
# =====================================================

if __name__ == "__main__":
    create_admin()