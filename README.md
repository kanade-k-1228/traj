# Trajectory Simulator

A web-based trajectory simulator for vehicle motion planning and visualization.

## Live Demo

🚀 **[View Live Demo](https://kanade-k-1228.github.io/traj/)**

## Features

- Interactive trajectory editing with multiple calculation modes:
  - **Position Mode**: Calculate velocities from position data
  - **Velocity Mode**: Calculate positions from velocity data
  - **Integral Mode**: Calculate position and orientation from velocity and yaw rate
  - **Differential Mode**: Calculate velocities from position and orientation
- Real-time visualization of trajectory plots
- Ground truth comparison with L1 loss calculation
- Import/Export trajectory data (JSON format)
- Visualization of acceleration, curvature, and position errors

## Development

### Prerequisites

- Node.js (v20 or higher)
- pnpm

### Installation

```bash
pnpm install
```

### Development Server

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Deploy to GitHub Pages

```bash
pnpm run deploy
```

This will build the project and deploy it to the `gh-pages` branch.

## GitHub Pages Setup

After running `pnpm run deploy`, you need to configure GitHub Pages:

1. Go to your repository on GitHub
2. Click on **Settings**
3. Navigate to **Pages** (in the left sidebar)
4. Under **Source**, select **Deploy from a branch**
5. Under **Branch**, select `gh-pages` and `/ (root)`
6. Click **Save**

The site will be available at: `https://kanade-k-1228.github.io/traj/`

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Jotai** - State management
- **Tailwind CSS** - Styling
- **Canvas API** - Graph rendering
