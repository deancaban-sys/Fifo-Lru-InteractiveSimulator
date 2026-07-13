# FIFO-LRU Simulator 

An interactive web-based simulator for the **FIFO** (First In First Out) and **LRU** (Least Recently Used) page replacement algorithms, built for PF110 - Operating Systems at St. John Paul II College of Davao.

🔗 **Live demo:** https://deancaban-sys.github.io/Fifo-Lru-InteractiveSimulator/

## Features

- Simulate **FIFO**, **LRU**, or both algorithms side by side
- Adjustable number of memory frames
- Accepts either numbers or letters as page references (not mixed)
- Live, reactive updates as you type — no submit button needed
- Simulation Schedule and Solution Table views matching lecture format
- Automatic hit/fault tracking with hit ratio, fault ratio, and percentage stats
- Input validation:
  - Blocks invalid characters
  - Blocks mixing numbers and letters in the same reference string
  - Blocks negative numbers
- Separate **Clear** (empties input) and **Reset** (restores default input) controls

## How to Use

1. Open `index.html` in your browser (or visit the [live demo](https://deancaban-sys.github.io/Fifo-Lru-InteractiveSimulator/))
2. Choose an algorithm: FIFO, LRU, or Both
3. Set the number of frames
4. Enter a page reference string using either **all numbers** (e.g. `7 0 1 2 3`) or **all letters** (e.g. `A B C D`)
5. Results update instantly — view the schedule, solution table, and statistics

## Project Structure

```
├── index.html      # Main page structure
├── style.css       # Styling
└── script.js       # FIFO/LRU logic and rendering
```

## Tech Stack

Plain HTML, CSS, and JavaScript — no frameworks or build tools required.

## Author

Built by GROUP 4 for PF110 - Operating Systems.
