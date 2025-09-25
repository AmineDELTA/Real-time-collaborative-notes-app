This is a modern, full-stack web application designed for teams and individuals to collaborate in organized workspaces. Each workspace ("space") provides a flexible, block-based editor for notes, tasks, documentation, and more. The platform emphasizes real-time collaboration, robust permissions, and a seamless user experience.

## 🚀 Features

- **Spaces:** Create, join, and manage multiple collaborative workspaces. Each space is a secure environment for your team or project.
- **Members & Roles:** Invite users to spaces, assign roles (Owner, Admin, Participant), and manage permissions. Owners have full control, including the ability to delete a space.
- **Block-Based Editor:** Add, edit, delete, and reorder content blocks. Blocks can represent text, tasks, code snippets, or other content types.
- **Real-Time Collaboration:** Changes to blocks and spaces are instantly reflected for all members. (WebSocket support planned/available.)
- **Robust Permissions:** Owners and admins can manage members and control access. Only authorized users can remove others or change roles.
- **Responsive UI:**
  - Fixed sidebar for navigation, member management, and quick actions.
  - Scrollable editor area for content creation and organization.
  - Sidebar remains static while the editor scrolls independently.
- **Space Lifecycle:**
  - If an owner leaves a space, the space is automatically deleted for all members.
  - Members can leave spaces; admins can remove participants.
- **Error Handling & Feedback:**
  - Clear feedback for all actions (success, error, loading).
  - Robust handling of API failures and permission errors.

## 🛠️ Tech Stack

- **Frontend:** React (Hooks), Axios, CSS Modules
- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL (or SQLite for development)
- **Authentication:** JWT-based user authentication
- **WebSockets:** Real-time updates for collaborative editing (optional/enabled)
- **Testing:** Pytest (backend), Jest (frontend)

## 🏁 Getting Started

1. **Clone the repository**
2. **Install dependencies**
   - `cd backend && pip install -r requirements.txt`
   - `cd frontend && npm install`
3. **Configure environment variables and database**
4. **Run backend and frontend servers**
5. **Register, create spaces, invite members, and start collaborating!**

## 📝 Roadmap & Improvements

- Enhanced block types (checklists, images, code, etc.)
- Improved real-time sync and conflict resolution
- Space templates and import/export
- Activity log and notifications
- Mobile-friendly UI
