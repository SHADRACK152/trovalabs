"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2025-11-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import backend.database as _db

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create all tables from SQLAlchemy metadata
    bind = op.get_bind()
    _db.Base.metadata.create_all(bind=bind)


def downgrade():
    bind = op.get_bind()
    _db.Base.metadata.drop_all(bind=bind)
