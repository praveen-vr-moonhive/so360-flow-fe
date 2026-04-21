# SO360 Flow Frontend

Workflow Definition + Execution Engine MFE for SO360 Platform

## Overview

The Flow frontend is a Micro Frontend (MFE) that provides UI for creating, managing, and executing workflows across all SO360 modules.

## Port

**3022**

## Tech Stack

- React 19.2
- Vite 5.4
- TypeScript 5.7
- Tailwind CSS 3.4
- React Router 7.12
- Framer Motion 12
- Lucide React
- Module Federation (@originjs/vite-plugin-federation)

## Features

### Flow Dashboard
- List all flow definitions
- Filter by module
- View flow status (active/inactive)
- Create new flows

### Flow Builder
- Create/edit flow definitions
- Define states with properties (initial, terminal)
- Define transitions between states
- Visual state and transition management

### Flow Instance Viewer (Planned)
- View active instances
- See current state
- View transition history
- Execute transitions

## Module Federation

This MFE is loaded by the Shell (port 3002) via Module Federation:

```typescript
// Federation config
{
  name: 'flow_app',
  exposes: {
    './App': './src/App.tsx'
  }
}
```

Access from Shell:
```typescript
const FlowApp = React.lazy(() => import('flow_app/App'));
```

## Shared Dependencies

These packages are shared with the Shell as singletons:
- react, react-dom, react-router-dom
- framer-motion, lucide-react
- @so360/shell-context
- @so360/design-system
- @so360/event-bus

## Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/flow` | `FlowDashboard` | Main flow listing with active instance counts |
| `/flow/builder/:flowId?` | `FlowBuilder` | Visual workflow designer — states, transitions, conditions |
| `/flow/simulator` | `FlowSimulatorPage` | Flow simulator for testing definitions |
| `/flow/instances` | `InstanceList` | Active flow instances with status filtering |
| `/flow/instances/:id` | `InstanceViewer` | Instance detail — current state, history, available transitions |
| `/flow/approvals` | `PendingApprovals` | Approval queue for current user; approve/reject/delegate |
| `/flow/policies` | `ApprovalPoliciesPage` | Approval policy management (admin) |

## API Integration

All API calls go through `/v1/flow/*` which proxies to Flow Backend (port 3021).

Multi-tenant headers are automatically injected:
- `X-Tenant-Id`
- `X-Org-Id`
- `X-User-Id`

## Development

```bash
# Install dependencies
npm install

# Start development server (WRONG - don't use)
# npm run dev

# CORRECT: Build and preview (for Module Federation)
npm run build && npm run preview

# Server runs on http://localhost:3022
# remoteEntry.js: http://localhost:3022/assets/remoteEntry.js
```

## Building

```bash
# TypeScript check + production build
npm run build

# Output: dist/assets/remoteEntry.js
```

## MFE Integration Pattern

The app uses `MfeShellInitializer` to sync with Shell context:

```typescript
<MfeShellInitializer>
  {/* App routes */}
</MfeShellInitializer>
```

This ensures:
- Tenant/org IDs are available before rendering
- Multi-tenant headers are set correctly
- Loading state shown during initialization

## Styling

- Dark theme with slate color palette
- Tailwind utility classes
- Matches SO360 design system
- Background: `bg-slate-950`
- Cards: `bg-slate-900/50 border-slate-800`
- Primary: `blue-600`, `blue-500`

## Future Enhancements

1. **Instance Viewer Page**
   - List instances by entity
   - Show current state + history
   - Execute transitions

2. **Visual Flow Designer**
   - Drag-and-drop state nodes
   - Visual transition arrows
   - Canvas-based editor

3. **Role-Based Transitions**
   - Check user roles before showing transition buttons
   - Integrate with Shell's `useIdentity()` hook

4. **Real-Time Updates**
   - Subscribe to flow events via Event Bus
   - Show notifications when transitions occur
   - Update instance list in real-time

## Testing

```bash
# Run tests (when configured)
npm run test

# Lint
npm run lint
```

## Integration with Shell

To integrate this MFE into the Shell:

1. Add to Shell's `vite.config.ts`:
```typescript
federation({
  remotes: {
    flow_app: 'http://localhost:3022/assets/remoteEntry.js'
  }
})
```

2. Add route in Shell's `App.tsx`:
```typescript
const RemoteFlow = React.lazy(() => import('flow_app/App'));

<Route path="/flow/*" element={
  <Suspense fallback={<LoadingSpinner />}>
    <RemoteFlow />
  </Suspense>
} />
```

3. Add to module config in `moduleConfig.ts`:
```typescript
{
  code: 'module:flow',
  name: 'Flow',
  icon: Workflow,
  path: '/flow',
  // ...
}
```
