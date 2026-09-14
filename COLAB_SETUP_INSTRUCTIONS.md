---
type: teaching-material
module: DASC513
audience: tutor
---

# Running the NORTHSTAR practicals in Google Colab — tutor setup

Six notebooks across two folders, two per practical. The week 5 pair lives in
`06 Week 5 - Foundations` (built by `build_week5_notebook.py` there, which
reuses the loading and Part 0/1 cells from `build_colab_notebooks.py` here);
weeks 6 and 7 are in this folder.

| File | Give to | Contents |
|---|---|---|
| `NORTHSTAR_week5_first_contact_STUDENT.ipynb` | Students | Loading, first look, value counts, the three fields to map, undocumented-fields check, exit ticket. About 40 minutes; the rest of week 5 is on paper |
| `NORTHSTAR_week5_first_contact_TUTOR.ipynb` | You | Same, plus tutor notes and a closing note on the mapping fields |
| `NORTHSTAR_week6_anonymisation_STUDENT.ipynb` | Students | Identifier triage, pseudonymisation, banding, k-anonymity, free text, secrets in git, verdict |
| `NORTHSTAR_week6_anonymisation_TUTOR.ipynb` | You | Same, plus every tutor note and the assessment guidance |
| `NORTHSTAR_week7_data_quality_STUDENT.ipynb` | Students | Loading, value counts, missingness, missingness by site, dates, plausibility, duplicates, verdict |
| `NORTHSTAR_week7_data_quality_TUTOR.ipynb` | You | Same, plus tutor notes |

All three student notebooks were executed end to end before delivery with no
errors. Each one is self-contained and loads the data itself.

The two CSVs (`NORTHSTAR_redcap_export.csv`, `NORTHSTAR_data_dictionary.csv`)
are in this folder too. They are the same files as in `02 NORTHSTAR dataset`.

## How the data gets into the notebook

The first code cell tries three things in order:

1. a URL, if you have pasted one into `DATA_URL` and `DICT_URL`;
2. a local file, if the CSV is beside the notebook (for you, on your own machine);
3. an upload prompt, in Colab only, asking the student to choose the files they
   downloaded from Canvas.

So you have a choice. **Option A** is to leave the URLs blank and let students
upload the CSVs from Canvas each session. It works and needs nothing but Canvas.
Its cost is a fiddly step at the start of every session, and it is the step
most likely to go wrong for the least confident students. **Option B** is to
host the two CSVs somewhere Colab can fetch them without logging in, paste the
URLs into the notebook, and the data appears without the student doing
anything. I would take Option B.

Canvas cannot be that host: its file links need a login and Colab cannot
follow them. A public GitHub repository is the usual answer. The data is
synthetic, so there is nothing to protect, and a public repository also makes
a small FAIR point in week 5.

## Option B, step by step

1. Create a public GitHub repository, for example `dasc513-northstar`. Add the
   two CSVs and the three STUDENT notebooks. A one-paragraph README saying the
   data is synthetic and what the notebooks are for is worth adding.

2. For each CSV, open it on GitHub, click **Raw**, and copy the address. It
   looks like
   `https://raw.githubusercontent.com/<you>/dasc513-northstar/main/NORTHSTAR_redcap_export.csv`.

3. Open each STUDENT notebook, find the first code cell, and paste the two
   addresses into `DATA_URL` and `DICT_URL`. Save. Do the same in the TUTOR
   versions so your copy behaves like theirs.

4. Commit the edited notebooks to the repository.

5. Build the Colab link for each notebook:
   `https://colab.research.google.com/github/<you>/dasc513-northstar/blob/main/NORTHSTAR_week6_anonymisation_STUDENT.ipynb`
   Test it in a private browser window so you see what a student sees.

6. On Canvas, post the Colab link as the primary route, and attach the
   `.ipynb` and the two CSVs as a download for anyone who cannot or will not use
   a Google account. The student guide in this folder is written for that page.

If you would rather not use GitHub, a Google Drive file shared as "anyone with
the link can view" also works for the notebook (open it with Colab from Drive),
but Drive links do not work as `DATA_URL`, so students would still upload the
CSVs. That is Option A with extra steps.

## What students need

A Google account. If the University provides Google Workspace accounts, ask IT
to confirm Colab is enabled on them; if it runs Microsoft 365 only, students
use personal accounts, and you should say so in advance so nobody is creating
one at the start of the session.

A browser. Chrome is safest; Safari and Firefox work.

Nothing else. No Python, no installs, no admin rights.

## Before the first session

- Open the Colab link yourself in a private window and run every cell. Do this
  the day before, not the morning of.
- Confirm the runtime is the default one. The notebooks need pandas and the
  standard library only; no GPU, no extra packages.
- Put the student guide on Canvas alongside the link.
- Have the HTML fallback ready: `File → Download → .html` from an executed copy
  gives a read-only version with all outputs visible, so the session runs even
  if Colab or the wifi does not.

## During the session

- The first slide of the practical is "File → Save a copy in Drive". Say it,
  then say it again. Students who skip it lose their work.
- Colab disconnects after roughly 90 minutes idle and caps sessions at about 12
  hours. A disconnect loses variables in memory, not the notebook.
  **Runtime → Run all** recovers in seconds.
- If a student sees "Warning: this notebook was not authored by Google", that
  is normal for any notebook opened from GitHub. Run anyway.
- The week 6 notebook creates a small git repository inside the Colab session
  for the secrets exercise. It lives in the session's temporary storage and
  vanishes when the runtime ends. Nothing is pushed anywhere.

## Getting work back

The simplest route is **File → Download → .ipynb** and submit through Canvas.
The notebook then contains their code, their outputs and their written answers
in one file. If you want to see the outputs without running anything, ask for
the `.html` export as well.

## The governance conversation

You are running a block about the safe handling of clinical data on a US cloud
service, under personal accounts, with a dataset that looks like patient
records. Because it is synthetic there is no breach, and the notebooks say so.
But someone will ask, and they are right to. Two minutes at the start of the
week 6 practical on why this would be unacceptable for real data, and what a
TRE does differently, turns the weakness into the lesson.

Do not use Colab for anything that is not synthetic. That is not a caution, it
is a rule.

## Regenerating the notebooks

Both are produced from `NORTHSTAR_exercise_DRAFT.ipynb` by
`build_colab_notebooks.py` (in `03 Exercises`). Edit the draft, re-run the
script, and all four files are rebuilt. Tutor notes are any blockquote
paragraph starting `> **TUTOR NOTE`; the script strips those for the student
versions, so you can add notes to the draft freely.
