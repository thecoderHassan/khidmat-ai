# Contributing to KhidmatAI

## Branch Strategy

```
main         ← stable, demo-ready code only
dev          ← all active development merges here
feature/*    ← your feature branch (branch off dev)
```

**Never push directly to `main`.** All code goes through a Pull Request.

## Workflow for Every Change

```bash
# 1. Always start from the latest dev
git checkout dev
git pull origin dev

# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then commit
git add .
git commit -m "feat: describe what you did"

# 4. Push your branch
git push origin feature/your-feature-name

# 5. Open a Pull Request → dev on GitHub
```

## Commit Message Format

| Prefix | When to use |
|---|---|
| `feat:` | New feature or agent logic |
| `fix:` | Bug fix |
| `wip:` | Work in progress (not ready to merge) |
| `docs:` | README or comments only |
| `refactor:` | Code cleanup, no behavior change |
| `data:` | Changes to providers.json or bookings.json |

Examples:
```
feat: implement Intent Agent with Gemini API
fix: handle missing location in discovery agent
data: add 10 more providers in G-15 area
wip: booking agent — slot selection half done
```

## Who Owns What

| File / Folder | Owner |
|---|---|
| `backend/agents/intent.py` | [Assign to abdur rahman & samiullah] |
| `backend/agents/discovery.py` | [Assign to abdur rahman & samiullah] |
| `backend/agents/recommendation.py` | [Assign to abdur rahman & samiullah] |
| `backend/agents/booking.py` | [Assign to abdur rahman & samiullah] |
| `mobile/screens/` | [Assign to aqib] |
| `backend/data/providers.json` | [Assign to me] |
| `antigravity/` | [Assign me] |

## Rules

1. **Do not** commit `.env` files — use `.env.example` as a template.
2. **Do not** change API endpoint paths in `backend/main.py` without telling the team.
3. **Do not** add a database — JSON files only.
4. **Do not** add a 5th agent — pipeline is locked at 4.
5. Every agent file must have a working `run(input_data: dict) -> dict` function.
6. Test your code locally before opening a PR.

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env    # fill in your keys
uvicorn main:app --reload
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## Questions?
Open a GitHub Issue or message the team on WhatsApp.
