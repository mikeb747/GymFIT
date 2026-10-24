# Goals System – Feature Specification

## Overview

I want to introduce a Goals system to the triathlon training app, primarily focused on running and triathlon training support.

The purpose is to allow users to define future race or performance goals and work backwards from those goals to establish achievable distance, pace and training milestones. The app should be able to compare current fitness levels against target performance and track progress towards achieving the goal.

## 1. Goals Management

Add a **Goals** section to Settings, allowing users to create and manage multiple goals or upcoming races. Each goal should be entered individually, with the option to add further goals.

Each goal should include:

- **Priority:** A / B / C goal.
- **Event type:** Run, Bike, Swim or Triathlon.
- **Event distance:** Suggested distances with the option to enter custom distances.
  - Running: 5km, 10km, 10 Mile, Half Marathon, Marathon.
  - Triathlon: Sprint, Olympic, 70.3, IRONMAN.
- **Target event time:** Overall target finish time, where applicable.
- **Event date.**
- **Goal status:** Upcoming, Completed, Abandoned or Missed.
- **Target type:** Finish the event, achieve a specific time or achieve a specific pace.
- **Milestones:** Ability to add intermediate performance and training targets.

## 2. Event-Specific Targets

Different event types should have their own relevant target fields.

**Running**
- Distance.
- Target finish time.
- Target average pace.
- Course type (road, trail or track).
- Elevation gain.

**Cycling**
- Distance.
- Target time.
- Average speed.
- Target power (optional).
- Elevation gain.

**Swimming**
- Distance.
- Target time.
- Pool or open water.

**Triathlon**

Triathlon events should support individual discipline distances and target times, rather than relying on predefined standard distances. This is important because events can have very different proportions of swimming, cycling and running.

Required fields:
- Total event distance and overall target time.
- Swim distance and target time.
- T1 target time.
- Bike distance and target time.
- T2 target time.
- Run distance and target time.

The overall target time should be calculated from the individual discipline and transition targets where provided.

## 3. Training Milestones and Backwards Tracking

Allow users to add milestones to each goal, working backwards from the event date and target performance.

Milestones should support three types:

**A. Distance targets**
- Run 5km in a target time.
- Run 10km in a target time.
- Run a half marathon in a target time.

**B. Pace targets**
- 1km at 3:45/km.
- 5km at 3:55/km.
- 10km at 4:05/km.

**C. Training workout targets**
- 6 × 1km at 3:50/km.
- 4 × 2km at 4:00/km.
- 3 × 10 minutes at threshold pace.

The system should eventually be able to suggest appropriate intermediate milestones based on the event date, target performance and current fitness levels, with the ability for users to edit or add their own.

## 4. Current Fitness and Progress Tracking

The app should maintain an estimate of current performance across different distances and disciplines, using recent activities, race results and manually entered benchmarks.

For example:

| Distance | Current ability | Goal |
|---|---:|---:|
| 5km | 19:15 | 18:30 |
| 10km | 40:00 | 38:30 |
| Half Marathon | 1:28:00 | 1:25:00 |

This allows the app to identify the gap between current ability and target performance, helping determine whether the user is on track.

## 5. Triathlon Training Allocation

For triathlon goals, the app should consider the individual demands of each discipline rather than treating the overall event distance as a single target.

For example, an event consisting of a 400m swim, 40km bike and 20-mile run will require considerably more running preparation than swimming preparation.

The app should eventually provide separate progress and readiness indicators for swimming, cycling and running, taking into account event distances, target times and current training volumes.

This could include comparing weekly training distances against the individual event discipline requirements, helping identify where additional training focus may be needed.

## 6. Implementation Considerations

The initial implementation should prioritise:
- Multiple goals with A/B/C priorities.
- Event-specific data fields and custom distances.
- Individual triathlon discipline and transition targets.
- Manual milestone creation and management.
- Current fitness benchmarks and comparison against goals.

The underlying data structure should allow for automatic milestone suggestions, activity-based progress tracking and discipline-specific training analysis to be introduced later without requiring a redesign of the goals system.
