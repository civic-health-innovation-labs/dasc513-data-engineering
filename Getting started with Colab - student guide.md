---
type: teaching-material
module: DASC513
audience: students
---

# DASC513 practicals: getting started with Google Colab

You do not need to install anything for the DASC513 practicals. The notebooks
run in Google Colab, which is a Jupyter notebook in your web browser. This page
gets you from nothing to a working notebook in about five minutes.

## What you need

- A Google account. Any Google account works; if you do not have one, create one
  before the session rather than during it.
- A web browser. Chrome is the safest choice.

## Opening the notebook

**Route 1, the easy one.** Click the Colab link on the Canvas page for the
week. The notebook opens in your browser. You may see a warning that the
notebook was not authored by Google; that is normal, click *Run anyway* when
asked.

**Route 2, if the link does not work for you.** Download the `.ipynb` file from
Canvas. Go to [colab.research.google.com](https://colab.research.google.com),
choose *File → Upload notebook*, and pick the file.

## The one thing you must do first

**File → Save a copy in Drive.**

Until you do this you are looking at a shared, read-only copy. Anything you type
disappears when you close the tab. Once you have saved a copy, it is yours, it
lives in your Google Drive, and it is there next week.

## Loading the data

Run the first code cell (click in it and press **Shift + Enter**).

If your tutor has set up a data link, the data loads by itself and you will see
a message like *loaded 100 records with 102 fields*.

If instead a *Choose Files* button appears, download the two CSV files from
Canvas (`NORTHSTAR_redcap_export.csv` and `NORTHSTAR_data_dictionary.csv`) and
choose them when asked. You may be asked twice, once for each file.

## Working through the notebook

- Cells run in the order you run them, not the order they appear. If something
  behaves oddly, use **Runtime → Run all** to start again from the top.
- Grey cells are code. White cells are text. Double-click a white cell to type
  your answers into it.
- Read every code cell before running it. If you can say in English what it
  does, you understand it.
- Colab disconnects if you leave it idle for a while. That loses what was in
  memory, not the notebook. **Runtime → Run all** brings everything back.

## Handing work in

**File → Download → .ipynb** saves the notebook to your computer with your code,
your outputs and your written answers in one file. Submit that through Canvas.

## If it goes wrong

- *"Notebook not authored by Google"*: normal, run anyway.
- *"Your session crashed"*: Runtime → Restart runtime, then Run all.
- *A cell has been running for ages*: click the square stop button next to it,
  then run it again.
- *I saved but my work has gone*: check you saved a copy in Drive, not just
  clicked save on the shared copy. Look in Drive under *Colab Notebooks*.
- Anything else: ask. Getting the environment working is part of the session,
  not something you are expected to have sorted before it.

## A note on where the data is

The NORTHSTAR dataset is entirely made up. No real patient is in it. That is why
it is acceptable to put it on Google's servers, and it is the only reason. Real
patient data would never be handled this way, and in week 6 you will see what is
done instead.
