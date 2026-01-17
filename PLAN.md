# AutoDS - AI Data Science Agent Roadmap

## Project Goal
Build an automated Data Science Agent that transforms raw data into insights, visualizations, and Jupyter Notebooks using natural language instructions.

## Tech Stack
- **Backend:** Python (FastAPI), Pandas, Scikit-Learn, Matplotlib, Nbformat.
- **Frontend:** React (Vite, TypeScript), TailwindCSS/Material UI.
- **AI/LLM:** DeepInfra API (zai-org/GLM-4.7) using OpenAI SDK.
- **Protocol:** WebSockets for real-time "Thinking" & Status updates.

## Development Phases

### Phase 1: Infrastructure Setup
- [ ] Initialize Git Repo & Structure
- [ ] Setup Backend (FastAPI) Environment
- [ ] Setup Frontend (React) Environment
- [ ] Configure DeepInfra Client (OpenAI Compatible)

### Phase 2: Core Agent Engine
- [ ] Implement `AgentOrchestrator` (Plan -> Execute -> Verify Loop)
- [ ] Create "Thinking" Streamer (WebSockets)
- [ ] Define Tool definitions (Load Data, Plot, Train Model)

### Phase 3: Data Handling & EDA
- [ ] File Upload API
- [ ] Data Profiling Service (Types, Missing Values)
- [ ] EDA Plot Generation Tools

### Phase 4: Notebook Generation
- [ ] `NotebookBuilder` Service (Programmatic .ipynb creation)
- [ ] Real-time code injection into notebook object

### Phase 5: UI & Experience
- [ ] Chat Interface with "Thought Process" expandable view
- [ ] Interactive Plot Rendering
- [ ] File Management & Notebook Download

## Coding Standards
- **Python:** PEP8, Type Hints (Pydantic), Modular Service Pattern.
- **React:** Functional Components, Hooks, TypeScript strict mode.
- **Commits:** Conventional Commits (feat, fix, chore, refactor).
