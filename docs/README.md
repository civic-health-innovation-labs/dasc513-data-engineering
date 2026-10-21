# NORTHSTAR practical pages (DASC513 weeks 5 to 8)

A static web app that walks students through each week's two-hour practical
(timings on the pages are indicative) without needing to run code. It is the classroom
companion to the Colab notebooks, which stay available for students who want
to experiment. The pages are the students' own knowledge base for the block:
nothing on them is marked or submitted.

Simplified on 21 October 2026 for students with very little coding
experience (the previous version is in `_backup 2026-10-21 pre-simplification`):

- each page opens with an indicative plan for the two-hour slot; the exercises
  themselves are sized for about 1 h 30 so there is room for discussion;
- every Your turn is preceded by a **Key idea** or **Before you answer** box
  that sets up, in plain language, the one concept the question needs;
- fewer, shorter questions, aimed at understanding the principle rather than
  the implementation (k-anonymity and MCAR/MAR/MNAR are explained, not tested);
- optional material sits in collapsed **Going further** boxes whose fields do
  not count towards progress (cross-field checks, reshaping, git history,
  the postcode trap, the ODS code stretch);
- the code is still shown in R and Python and still runs, but is framed as
  "read the English line, press Run".

| Page | Session | Built from |
|---|---|---|
| `index.html` | Landing page: how the pages work, data downloads, backup and restore | |
| `week5.html` | First contact: intended use (5 rows), provenance (7 rows), FAIR at the four-letter level, mapping three fields | Week 5 notebook and handouts 1 to 4 |
| `week6.html` | Data flow diagram, three-row STRIDE table, sorting 14 columns, de-identification, k-anonymity explorer, free text, Five Safes; git history optional | Week 6 notebook, plan and tutor notes |
| `week7.html` | Missing values and missingness by site, dates, six plausibility decisions, the duplicate, transformation log and a six-row datasheet; cross-field checks and reshape optional | Week 7 notebook, plan and datasheet handout |
| `week8.html` | Mini DPIA (three risks), access application (six field groups), committee with four criteria and a decision letter | Week 8 handouts 1, 2, 3 and 5 |

## How it works

- **No server, nothing sent anywhere.** Answers save to the browser's
  `localStorage` as students type. The page warns them when the browser blocks
  saving (private windows, some managed PCs).
- **Downloads.** Each page exports the student's answers, tables and chosen
  outputs as a Word-compatible `.doc`, as Markdown, or via print to PDF. A
  JSON backup holds all four weeks and restores on another computer.
- **Code in R and Python.** Every "Run" box shows the code in both languages
  (R is the default; the choice is remembered). Pressing Run shows the output
  computed in the browser from the real data. Every R and Python block has been
  run for real against the CSV and gives the same numbers as the page.
- **Works offline and from disk.** The CSVs are embedded in `assets/data.js`,
  so the pages also work opened straight from a USB stick.

## Publishing on GitHub Pages

1. Copy this folder's contents into the course repository, either at the root
   of a `gh-pages` branch or into a `docs/` folder on `main`.
2. In the repository settings, under Pages, choose that branch and folder.
3. The site appears at
   `https://civic-health-innovation-labs.github.io/dasc513-data-engineering/`
   (or `/docs/` path equivalent). Link it from Canvas.

The `tests/` folder is not needed on the live site.

## Changing the data

Replace the CSVs in `data/`, then run `python3 build_data.py` to regenerate
`assets/data.js`. Then check the numbers the pages quote in their text (for
example the D-dimer missing counts in week 7 Part 2 and the plausibility rows
in week 7 Your turn 4), because those are written into the HTML.

## Files

| File | What it does |
|---|---|
| `assets/app.js` | Shared behaviour: autosave, code tabs, Run buttons, form and row tables, progress, export, backup |
| `assets/northstar.js` | Data helpers that reproduce pandas and R behaviour (CSV parsing, site date formats, century fix, SHA-256 pseudonyms, k-anonymity) |
| `assets/render.js` | Output tables in the style of R and pandas |
| `assets/week5.js` … `week8.js` | Each page's outputs and interactive parts |
| `assets/style.css` | All styling, including dark mode and print |
| `tests/check_helpers.js` | Node check that the helpers reproduce the notebook's numbers |

## Notes for R users

- Week 6 pseudonymisation uses the `openssl` package (`install.packages("openssl")`).
- Week 7 reshaping uses `tidyr` (`install.packages("tidyr")`).
- Everything else is base R.
