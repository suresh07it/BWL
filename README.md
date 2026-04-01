# BWL (Blueworks Live) Clone — BPMN Modeling Platform (Demo)

This repository is a working demo of a web-based Process Modeling platform that aims to *clone the UI/UX patterns* of IBM Blueworks Live (BWL) while using **bpmn-js** as the diagramming engine.

It is built as a split **frontend (React + Vite)** and **backend (Spring Boot)**:

- The **frontend** provides the BWL-style Library UI (spaces → process blueprints → BPMN editor) and the “Details” popup for task metadata.
- The **backend** provides storage for BPMN XML files, “Library” catalog APIs (spaces/process lists), task-metadata persistence, and PDF export.

The goal of this README is to be detailed enough that you can paste it into another LLM and get useful, specific feedback or next steps.

---

## 1) Business Overview (What the app does)

### 1.1 BWL-style “Library” navigation

The UI is structured around the **Library** concept:

1. **Library** shows a set of **Spaces** (similar to BWL “Spaces”).
2. Clicking a space opens **Space Details**, showing a list of **Process Blueprints** (process models).
3. Clicking a process opens the **BPMN Editor** where the diagram is displayed and updated.

Other top navigation tabs (“Work”, “Community”) exist as placeholders; the demo’s state and functionality live inside **Library**.

### 1.2 Create / Update / View behavior

Inside the editor:

- **View** mode is read-only (palette/authoring UI hidden by using the bpmn-js Viewer).
- **Update** mode enables editing (palette/authoring UI visible by using the bpmn-js Modeler).
- New elements dropped onto the canvas during Update mode can automatically trigger the metadata popup (BWL-like “open details right after creating a task”).

### 1.3 Task “Details” popup

The demo implements a BWL-like Details UI for BPMN tasks:

- The popup is opened on **double-click** of a BPMN task shape.
- The popup has tabs: **Details / Problems / Policies / Documentation / Attachments / Comments** (only Details is functional, others are placeholders).
- The Details tab contains fields modeled after BWL screenshots:
  - Participant
  - Business Owners (list editor)
  - Experts (list editor)
  - Systems (list editor)
  - Due Date
  - Cycle Time (value + unit)
  - Wait Time (value + unit)

### 1.4 Persisting metadata separately from BPMN XML

Task metadata is persisted as **JSON** on the backend, stored adjacent to the BPMN file (same folder/space).

- One JSON file per BPMN diagram:
  - `data-store/<space>/<fileName>.meta.json`
- The JSON contains multiple task entries keyed by BPMN element id:

```json
{
  "tasks": {
    "ServiceTask_1": {
      "participant": "…",
      "businessOwners": ["…"],
      "experts": ["…"],
      "systems": ["…"],
      "dueDate": "YYYY-MM-DD",
      "cycleTimeValue": "…",
      "cycleTimeUnit": "Days",
      "waitTimeValue": "…",
      "waitTimeUnit": "Days"
    }
  }
}
```

Rules:
- In **Update** mode the fields are editable and can be saved.
- In **View** mode the fields are visible but read-only.

### 1.5 Export to PDF

The demo exports a **business-friendly PDF report**:

- Top of PDF: high-resolution diagram image (SVG rendered to PNG server-side).
- Service Task properties: lists each Service Task’s saved metadata as clean key/value pairs.
- The export intentionally excludes raw BPMN XML and raw JSON to keep the PDF readable.

The UI shows an Export modal with:
- Download diagram image (SVG only)
- Download PDF report (image + service task properties)

---

## 2) Architecture Overview (How it works)

### 2.1 Tech stack

**Backend**
- Java + Spring Boot (REST)
- File-system storage provider (writes under `data-store/`)
- PDF generation: Apache PDFBox
- SVG → PNG rendering: Apache Batik

**Frontend**
- React + Vite
- bpmn-js:
  - Viewer for View mode
  - Modeler for Update mode

### 2.2 Folder structure

```
BWL/
  backend/
    src/main/java/com/bwl/
      controller/               # BPMN diagram CRUD endpoints
      library/                  # Library catalog endpoints (spaces + process list)
      metadata/                 # Metadata JSON endpoints (adjacent to BPMN files)
      export/                   # PDF export endpoint + PDF builder
      service/ storage/         # Storage abstraction/provider(s)
    src/main/resources/
      application.properties
  frontend/
    src/
      app/
        api/                    # Frontend API client wrappers
        components/             # Top navigation etc.
        library/                # Library dashboard + space details UI
        editor/                 # BPMN editor + Details panel
        types/                  # Shared types (metadata)
      assets/                   # Logo / theme assets
```

---

## 3) Backend (Spring Boot) — APIs + storage

### 3.1 BPMN Diagram REST API

These endpoints manage BPMN files under a space.

- List diagrams:
  - `GET /api/spaces/{spaceName}/diagrams`
  - Returns JSON array of filenames.
- Get BPMN XML:
  - `GET /api/spaces/{spaceName}/diagrams/{fileName}`
  - Returns XML string.
- Save BPMN XML:
  - `POST /api/spaces/{spaceName}/diagrams/{fileName}`
  - Body is XML.

Implementation:
- Controller: `backend/src/main/java/com/bwl/controller/BpmnController.java`
- Storage abstraction: `com.bwl.service.BpmnStorageService`
- File-system provider writes to `storage.base-dir` (default `./data-store`).

### 3.2 Library catalog API (Spaces + Process Blueprints)

Spaces and process lists are served from the backend (frontend does not keep demo arrays).

- List spaces:
  - `GET /api/library/spaces`
  - Returns `[{ id, name, lastModifiedBy, lastModifiedAt, items }]`
- List processes for a space:
  - `GET /api/library/spaces/{spaceId}/processes`
  - Returns processes with `id/name/fileName/lastModified*`
- Create new process:
  - `POST /api/library/spaces/{spaceId}/processes`
  - Body: `{ "name": "…" }`
  - Creates a BPMN file (seed diagram) and returns the created process record.

Implementation:
- `backend/src/main/java/com/bwl/library/LibraryController.java`
- `backend/src/main/java/com/bwl/library/LibraryCatalogService.java`
- `backend/src/main/java/com/bwl/library/LibrarySeeder.java` seeds initial space/process diagrams on app startup.

### 3.3 Metadata persistence API

Metadata is stored as JSON adjacent to the BPMN file on disk.

- Read metadata:
  - `GET /api/spaces/{spaceName}/diagrams/{fileName}/metadata`
- Save metadata (whole-document update):
  - `PUT /api/spaces/{spaceName}/diagrams/{fileName}/metadata`
  - Body is the metadata JSON document with tasks keyed by element id.

File written:
- `data-store/<space>/<fileName>.meta.json`

Implementation:
- Controller: `backend/src/main/java/com/bwl/metadata/DiagramMetadataController.java`
- Service interface: `backend/src/main/java/com/bwl/metadata/DiagramMetadataService.java`
- File-system service: `backend/src/main/java/com/bwl/metadata/FileSystemDiagramMetadataService.java`

### 3.4 Export API (PDF)

- Export PDF report:
  - `POST /api/spaces/{spaceName}/diagrams/{fileName}/export/pdf`
  - Body: `{ "svg": "<svg>…</svg>" }`
  - Returns `application/pdf` download

The backend:
- Reads BPMN XML for the diagram to find ServiceTasks
- Reads metadata JSON for saved fields
- Renders SVG → PNG
- Builds a PDF (title, image, service task key/value sections)

Implementation:
- Controller: `backend/src/main/java/com/bwl/export/ExportController.java`
- PDF builder: `backend/src/main/java/com/bwl/export/PdfExportService.java`
- Error type: `backend/src/main/java/com/bwl/export/ExportPdfException.java`

Security hardening:
- XML parsing has XXE protections enabled (external entity processing disabled).
- PDF export logs meaningful context on failures (space + file).

---

## 4) Frontend (React) — Views and components

### 4.1 “Routing” approach

No full router is used; instead the app uses a simple state machine for the Library context:

- `LIBRARY` → space tiles grid
- `SPACE` → space details with process list
- `EDITOR` → BPMN editor

Entry:
- `frontend/src/App.tsx` renders `LibraryApp`
- `frontend/src/app/LibraryApp.tsx` holds the view state

### 4.2 Top Navigation

Top navigation includes:
- NatWestGroup branding
- Work / Community / Library tabs (Library is the demo context)

Implementation:
- `frontend/src/app/components/TopNav.tsx`

### 4.3 Library Dashboard (Space tiles)

Shows:
- Space list in a BWL-like grid layout
- Filter bar
- Item count

Spaces are loaded from backend:
- `GET /api/library/spaces`

Implementation:
- `frontend/src/app/library/LibraryDashboard.tsx`

### 4.4 Space Details (Process Blueprints list)

Shows:
- Left: space details panel (description/activity stream placeholder)
- Right: process list with filter + create new process

Processes are loaded from backend:
- `GET /api/library/spaces/{spaceId}/processes`

Create new process:
- `POST /api/library/spaces/{spaceId}/processes`

Implementation:
- `frontend/src/app/library/SpaceDetails.tsx`

### 4.5 BPMN Editor (Viewer/Modeler)

The editor loads BPMN XML from backend and runs in 2 modes:

- **VIEW**: bpmn-js Viewer (read-only)
- **EDIT**: bpmn-js Modeler (palette visible)

The editor:
- Loads BPMN XML: `GET /api/spaces/{space}/diagrams/{file}`
- Saves BPMN XML: `POST /api/spaces/{space}/diagrams/{file}`
- Loads metadata: `GET /api/spaces/{space}/diagrams/{file}/metadata`
- Saves metadata: `PUT /api/spaces/{space}/diagrams/{file}/metadata`

Implementation:
- `frontend/src/app/editor/BpmnEditor.tsx`

### 4.6 Details popup triggering logic

Current behavior:
- Popup opens on **double-click** for BPMN Task elements (`bpmn:*Task`).
- In Update mode, newly created shapes can trigger auto-open via:
  - `commandStack.shape.create.postExecuted`

This is implemented using `eventBus` and also a DOM fallback that resolves `data-element-id` to element objects.

### 4.7 Save UX

In Update mode:
- The Save button label is “Save”
- Clicking Save:
  - button disappears
  - “Saved ✓” appears
- Any canvas interaction resets “Saved ✓” back to the Save button

### 4.8 Export UX

Export modal provides:
- Download diagram image only (SVG)
- Download PDF report (diagram image + ServiceTask properties)

The PDF is generated by the backend.

---

## 5) Type Safety (Metadata)

Metadata is typed in the frontend to avoid unsafe `any`:

- Shared types:
  - `frontend/src/app/types/metadata.ts`
- The editor re-exports these:
  - `frontend/src/app/editor/types.ts`
- API normalization ensures runtime safety even if the backend returns malformed JSON:
  - `frontend/src/app/api/bpmnApi.ts`

---

## 6) How to run locally

### 6.1 Backend

From `backend/`:

```bash
mvn spring-boot:run
```

Backend runs on:
- `http://localhost:8081`

### 6.2 Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Vite dev server prints the URL, typically:
- `http://localhost:5173`

---

## 7) Key configuration

Backend uses:

- `storage.provider=filesystem`
- `storage.base-dir=${user.dir}/data-store`
- `server.port=8081`

File locations:
- BPMN: `data-store/<space>/<fileName>`
- Metadata: `data-store/<space>/<fileName>.meta.json`

---

## 8) Current limitations / Known gaps (for future work)

This is a demo, not a full Blueworks clone. Some planned improvements:

- Spaces/processes are currently seeded from backend code; a real app would store these in DB.
- PDF layout is functional but basic; could be improved with table layout, pagination, and better typography.
- Viewer mode is read-only by using bpmn-js Viewer; a true BWL-like “limited interactions” mode could be added.
- Metadata is persisted as JSON adjacent to BPMN; could be merged into BPMN extensions or stored in DB for enterprise requirements.
- Export could support PNG export, ZIP bundles, and richer reports.

---

## 9) Prompt for another LLM (optional copy/paste)

If you want another LLM to propose improvements, you can paste this:

> You are reviewing a demo “Blueworks Live clone” built with React + bpmn-js and Spring Boot.  
> The system supports Library → Spaces → Process Blueprints → BPMN editor (View/Update), a BWL-like Details popup for tasks, metadata persistence as JSON next to BPMN files, and PDF export with diagram image + service task properties.  
> Please propose improvements for architecture, type safety, security, scalability, UI alignment with BWL, and export quality.  
> Suggest next endpoints/features needed to replace seeding with real persistence.

