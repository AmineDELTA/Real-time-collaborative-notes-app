"""Fix users_in_spaces foreign key cascade

Revision ID: 3a712a139128
Revises: 582a27adf195
Create Date: 2025-08-27 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3a712a139128'  # ✅ Fix: Use actual revision ID (from filename)
down_revision: Union[str, Sequence[str], None] = '582a27adf195'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Drop the existing foreign key
    try:
        op.drop_constraint('users_in_spaces_space_id_fkey', 'users_in_spaces', type_='foreignkey')
    except Exception:
        pass  # Constraint might not exist
    
    # Recreate with CASCADE delete
    op.create_foreign_key(
        'users_in_spaces_space_id_fkey',
        'users_in_spaces', 'spaces',
        ['space_id'], ['id'],
        ondelete='CASCADE'
    )

def downgrade() -> None:
    # Reverse the change
    op.drop_constraint('users_in_spaces_space_id_fkey', 'users_in_spaces', type_='foreignkey')
    op.create_foreign_key(
        'users_in_spaces_space_id_fkey',
        'users_in_spaces', 'spaces',
        ['space_id'], ['id']
    )