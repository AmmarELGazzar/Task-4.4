# UI/UX Rescue Challenge — Submission

**Modified files:** `src/App.jsx`, `src/styles.css` (new rules are appended in a separate section and none of the original rules were removed), `index.html` (an empty favicon so the console has no 404 error).
**Screenshots:** `screenshots/before-*.png` and `screenshots/after-*.png`.
**Tests:** `tests/ui-check.mjs` (23 scripted checks in a real browser, all passing).

## User goals

1. **Seeker:** "I lost my item. Is there a matching found notice, and where can I get the item back?"
2. **Finder:** "I found something. How do I report it, and where should I hand it in?"

---

## Improvement 1: Validation messages that say what is wrong and how to fix it

**Problem (before-5, before-6):** `validate()` already worked out the exact problem, such as "same title at this location" or "title too short". `submit()` threw that result away and showed only *"Please review your entries."* No field was highlighted, and focus stayed on the button. A student who posts a duplicate cannot find out what to change. Worse, the duplicate may be the very report they are looking for, and nothing points them to it.

**Fix (after-7, after-8):**
- Each field shows its own error, using the original messages. Fields get `aria-invalid` and `aria-describedby`. Focus moves to the first invalid field. A summary at the bottom lists each problem, and clicking one jumps to that field.
- When the duplicate rule fires, the form shows a **"View the existing 'Black backpack' report"** link, or suggests changing the title or location.
- Each error clears as soon as its field is corrected. The duplicate error also clears when the location changes. Cancelling a form with unsaved entries asks for confirmation first.
- **The validation rules are unchanged:** title of at least 2 characters, required status and category, and no duplicate title at the same location (ignoring case and spaces). The tests cover all of them, for both create and edit.

## Improvement 2: Help a seeker find matching notices

**Problem (before-2, before-3):**
- Searching "blue earbuds" returned **0 results**, although two earbud reports exist. The search matched only the exact phrase.
- The **Apply** button did nothing; filters already applied as you typed. It just showed a message, which misleads people about how the filters work.
- "Missing items" filtered the board but still showed FOUND and CLAIMED columns saying *"Nothing here yet"*, which is false. The current view wasn't highlighted.
- Nothing connected a lost report to a found report that looked like the same item.

**Fix (after-2 to after-5, after-11):**
- Search words can be in any order. Search also covers category and collection point, so "security desk" works.
- "Apply" is replaced by a live count: *"Showing 2 of 13 reports"*. **Clear filters** is disabled when no filters are set.
- Header views show only the matching column and are marked `aria-current`. Empty results show a clear message with "Clear filters" and "Post a report" buttons.
- **Possible matches:** lost and found cards show a link such as "1 possible found match →". A match is a report with the opposite status, in the same category, sharing at least 2 descriptive words. After you post a lost report, the confirmation message says *"1 found report may match it. View possible matches"*.

## Improvement 3: Show where a found item is and how to get it back

**Problem (before-1, before-7):**
- Cards said "Received at Campus Security Desk" or "Reported found - not confirmed at a collection point" in 10px grey text. They gave no next step, so a seeker didn't know what to bring or whether the item was actually there.
- The finder's form never mentioned collection points.
- "Edit" was hidden in a "···" menu. On other people's reports, that menu only said "Reported by another student", which leads nowhere.

**Fix (after-6, after-9, after-10, after-12):**
- Every found or claimed card shows a colour-coded status box with a next step:
  - **Held at X** (green): "Staff release it after verifying ownership. Bring your student ID and a detail only the owner would know."
  - **Not at a collection point yet** (amber).
  - **Returned to its owner** (blue).
- **The status choice now comes first in the form, as three large options** ("I lost / I found / Already back with its owner"). The location label and the description hint change to match the choice. For found items, the hint says to keep back one identifying detail so staff can verify the owner.
- Finders see a **"Hand it in at a collection point"** box with an optional "Where did you hand it in?" menu. **This does not mark the item as held by staff.** The card says *"Finder says it was handed in at X. Awaiting staff confirmation."* The stored record keeps `handoverStatus: 'reported'` and an empty `collectionPoint`. Editing a report that staff already confirmed leaves its handover status unchanged.
- Your own reports have a "Your report" badge and a visible **Edit** button. The "···" menu is removed. The `owner === 'you'` check in `edit()` is kept.
- Text on cards is larger and has more contrast (10px became 12.5px). Keyboard focus outlines are now visible everywhere.

---

## AI suggestion I refined or rejected

For the seeker's search problem, the AI first suggested **adding Fuse.js fuzzy search** and replacing the three-column board with one list ranked by relevance.

- **Rejected Fuse.js:** it adds a dependency, and its fuzzy scoring is hard to explain. For example, "bag" would match "badge". It also gives no clear reason why a result appeared. Simple matching on all words in any order fixes the real failure ("blue earbuds") and stays predictable.
- **Refined the ranking idea:** fuzzy matching is useful, but not inside the search box. I turned it into a separate **"Possible matches"** feature. It suggests matches using category plus at least 2 shared words, and the banner says why the items are shown. I raised the threshold from 1 to 2 shared words after testing: with 1, "black" alone matched the USB flash drive to the calculator.
- **Kept the three columns:** the lost/found/claimed board is the product's main way of organising reports. Instead, header views now show only the relevant column.

## Demo and testing

- **Main actions:** posting a found item handed in at Library Reception gives an "awaiting staff confirmation" card (after-9, after-10). Posting a lost flash drive suggests a match (after-11).
- **Unsuccessful actions:** an empty form gives 3 inline errors (after-7). A duplicate "black backpack" at "Library - second floor" is rejected with a link to the existing report (after-8).
- `tests/ui-check.mjs` checks: search, the empty-results state, header views, matches, edit only on your own reports, every validation rule (create and edit), the found-item handover staying unconfirmed, edits keeping a staff-confirmed status, data surviving a page reload (localStorage), Reset demo, no horizontal scrolling at 390px width, and no console errors. Result: **23/23 passing**.
