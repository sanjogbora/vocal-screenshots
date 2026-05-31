# VoCal Screenshot Generator

Static web tool for editing the VoCal nutrition screenshot values.

Open `index.html` in a browser. The editor controls daily calorie and macro limits, meal names, item names, item calories, and item macros. The phone preview rolls those values up into meal totals, macro progress bars, eaten calories, and calories left.

Use the `Opened` and `Collapsed` controls to switch between the two Figma states, then use `Download PNG` to export the current phone preview.

Use the `Gemini import` section to open the Gemini Gem, describe the dishes and meal times, then paste Gemini's JSON response back into the app to populate limits, meals, items, calories, and macros in one step.

The preview uses local copies of the Figma-exported icons and the Fraunces / Plus Jakarta Sans font files, so it does not depend on remote assets at runtime.
