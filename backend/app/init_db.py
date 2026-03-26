from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.document import Document, Folder, DocumentAccess, DocumentChunk


def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()

        if admin_user:
            print("Admin user exists - resetting password")
            admin_user.hashed_password = get_password_hash("admin")
            admin_user.is_active = True
            admin_user.role = UserRole.ADMIN
            admin_user.email = "admin@example.com"
        else:
            print("Creating admin user...")
            admin_user = User(
                username="admin",
                email="admin@example.com",
                full_name="Administrator",
                hashed_password=get_password_hash("admin"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)

        db.commit()
        print("Admin user ready!")
        print("Username: admin")
        print("Password: admin")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
