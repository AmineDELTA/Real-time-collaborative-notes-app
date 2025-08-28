"""Add block model and fix enum conflicts

Revision ID: 582a27adf195
Revises: fa240f93b5ae
Create Date: 2025-08-27 13:56:32.094567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '582a27adf195'
down_revision: Union[str, Sequence[str], None] = 'fa240f93b5ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    
    # Check if blocktype enum exists using text() for proper SQL execution
    result = conn.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blocktype')")
    ).scalar()
    
    if not result:
        # Create the enum type
        conn.execute(sa.text("CREATE TYPE blocktype AS ENUM ('TEXT', 'HEADING', 'BULLET_LIST', 'NUMBERED_LIST')"))
    
    # Manually alter the type column with USING clause
    conn.execute(sa.text("ALTER TABLE blocks ALTER COLUMN type TYPE blocktype USING type::blocktype"))
    
    # Continue with other column alterations
    op.alter_column('blocks', 'content',
               existing_type=sa.VARCHAR(),
               type_=sa.Text(),
               nullable=True)
    op.alter_column('blocks', 'order',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('blocks', 'updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               nullable=False)
    
    # Handle foreign key constraint
    try:
        op.drop_constraint('blocks_space_id_fkey', 'blocks', type_='foreignkey')
    except:
        pass  # Constraint might not exist or have different name
    
    op.create_foreign_key(None, 'blocks', 'spaces', ['space_id'], ['id'], ondelete='CASCADE')
    
    # Fix the index names
    try:
        op.drop_index('ix_users_in_space0s_id', table_name='users_in_spaces')
    except:
        pass  # Index might not exist
    
    op.create_index('ix_users_in_spaces_id', 'users_in_spaces', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_users_in_spaces_id', table_name='users_in_spaces')
    op.create_index('ix_users_in_space0s_id', 'users_in_spaces', ['id'], unique=False)
    op.drop_constraint(None, 'blocks', type_='foreignkey')
    op.create_foreign_key('blocks_space_id_fkey', 'blocks', 'spaces', ['space_id'], ['id'])
    op.alter_column('blocks', 'updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               nullable=True)
    op.alter_column('blocks', 'order',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('blocks', 'content',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(),
               nullable=False)
    
    # Convert enum back to VARCHAR
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE blocks ALTER COLUMN type TYPE VARCHAR USING type::text"))
