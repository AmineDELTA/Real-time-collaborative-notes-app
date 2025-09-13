"""update_roles_to_participant_visitor

Revision ID: 74675cced92a
Revises: b10a7ec0b953
Create Date: 2025-09-03 17:09:29.348845

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74675cced92a'
down_revision: Union[str, Sequence[str], None] = 'b10a7ec0b953'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Update existing role values
    op.execute("UPDATE users_in_spaces SET role = 'participant' WHERE role = 'editor'")
    op.execute("UPDATE users_in_spaces SET role = 'visitor' WHERE role = 'viewer'")


def downgrade() -> None:
    """Downgrade schema."""
    # Revert changes
    op.execute("UPDATE users_in_spaces SET role = 'editor' WHERE role = 'participant'")
    op.execute("UPDATE users_in_spaces SET role = 'viewer' WHERE role = 'visitor'")
