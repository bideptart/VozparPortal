
# Vozper Pricing Page Redesign - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: Set Up shadcn/ui Structure
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Create the required folder structure: src/components/ui, src/lib
  - Create src/lib/utils.js for cn() utility
  - Create shadcn/ui Card components in src/components/ui/
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `human-judgement` TR-1.1: Verify that src/components/ui and src/lib folders exist
  - `human-judgement` TR-1.2: Verify src/lib/utils.js has cn() function
  - `human-judgement` TR-1.3: Verify card components are present in src/components/ui
- **Notes**: Completed! Created all required folders, cn() utility, and Card components, updated tailwind.config.js and vite.config.js!

## [x] Task 2: Install Required Dependencies
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Install motion/react, @number-flow/react, framer-motion via npm
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: Verify dependencies are in package.json
  - `programmatic` TR-2.2: Verify node_modules has the dependencies installed
- **Notes**: Completed! Installed framer-motion, @number-flow/react, clsx, and tailwind-merge!

## [x] Task 3: Create Custom Animation Components
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - Create VerticalCutReveal component in src/components/ui
  - Create TimelineContent component in src/components/ui
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: Verify both components are in src/components/ui
  - `human-judgement` TR-3.2: Verify components are adapted to .jsx
- **Notes**: Completed! Created vertical-cut-reveal.jsx and timeline-content.jsx!

## [x] Task 4: Create Adapted Pricing Component
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - Create Pricing component in src/components/ui adapted to Vozper's design system
  - Change colors to use Vozper's theme (--primary, --accent, etc.)
  - Adapt to .jsx (remove TypeScript types)
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-4.1: Verify pricing component exists
  - `human-judgement` TR-4.2: Verify colors match Vozper's theme
- **Notes**: Completed! Created pricing.jsx in src/components/ui using Vozper's design variables!

## [x] Task 5: Replace Existing Pricing Page
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - Replace src/surfaces/customer/Pricing.jsx with the new component
  - Test the page in the dev server
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-5.1: Verify the new pricing page loads correctly
  - `human-judgement` TR-5.2: Verify the monthly/yearly toggle works
- **Notes**: Completed! Replaced src/surfaces/customer/Pricing.jsx to import and use the new component!
