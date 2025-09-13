"""add_updated_at_default_to_blocks

Revision ID: 1264dc044da3
Revises: 74675cced92a
Create Date: 2025-09-03 18:33:02.563155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1264dc044da3'
down_revision: Union[str, Sequence[str], None] = '74675cced92a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
