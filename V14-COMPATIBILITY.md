# Foundry V14 compatibility

This unreleased change targets **Foundry 14.367**, the latest stable build listed on the
[official release index](https://foundryvtt.com/releases/) when checked on September 12, 2026.
The V14 API documentation and the public browser client served by the
[official demo](https://demo.foundryvtt.com/join) were inspected at **14.365**. The subsequent
[14.366](https://foundryvtt.com/releases/14.366) and [14.367](https://foundryvtt.com/releases/14.367)
release notes were also reviewed.

## Scope and API evidence

| Integration | Change and reason | Reference |
| --- | --- | --- |
| Core applications | Keep the existing quest log, preview, tracker, and dialogs on ApplicationV1. Foundry still supports these classes in V14. | [FormApplication](https://foundryvtt.com/api/v14/classes/foundry.appv1.api.FormApplication.html) |
| Actor and reward sheets | Replace `bringToTop()` with `bringToFront()`. Track V2 sheets by `id` in `foundry.applications.instances`, while retaining V1 `appId` / `ui.windows` support. V14 removed V2 `bringToTop()`. | [Compatibility removals](https://github.com/foundryvtt/foundryvtt/issues/13436), [application registry](https://foundryvtt.com/api/v14/variables/foundry.applications.instances.html) |
| Image popouts | Use the V2 `{ src }` constructor and focus API. Recreate the reward popout when the image changes because V2 freezes its options. | [ImagePopout](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.ImagePopout.html), [ApplicationV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html) |
| Ownership | Use `{ document, position }`, V2 rendering options, and the configured form handler receiving `FormDataExtended.object`. The old `_updateObject` override is never invoked by this V2 dialog. Retain the existing ownership replacement behavior and check document update permission at submission. | [DocumentOwnershipConfig](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.DocumentOwnershipConfig.html) |
| Journals | Listen for `renderJournalEntrySheet`, handle native elements and null selector results, and avoid duplicate buttons during partial renders. Retain the legacy journal hook for external sheets. | [V2 render hooks](https://foundryvtt.com/api/v14/functions/hookEvents.renderApplicationV2.html), [JournalEntrySheet](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.journal.JournalEntrySheet.html) |
| Tracker docking | Initialize collapsed state from `Sidebar.expanded` and use the measured sidebar top for the docking boundary. The previous boundary stayed at its `-1` sentinel. | [Sidebar](https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.Sidebar.html) |

Some of these integration problems originated in the V13 port and also affect V14. They are addressed together so
existing quest workflows remain usable. Quest data, public APIs, translations, dependencies, and upstream release URLs
are unchanged. A release version is left for the upstream maintainer to select.

V14 removed bundled TinyMCE, but FQL already explicitly uses ProseMirror. The demo source confirms that its editor
instance and serialization APIs remain available, so no editor rewrite is included. Existing scene controls and
`JournalEntry.panToNote()` still use supported APIs; core handles scene-level navigation.
See [TinyMCE removal](https://foundryvtt.com/releases/14.354) and the
[JournalEntry API](https://foundryvtt.com/api/v14/classes/foundry.documents.JournalEntry.html).

## Validation

The changed JavaScript passes targeted ESLint and syntax checks. Repository-wide ESLint reports existing errors in
`src/control/db/Enrich.js` (shadowing `TextEditor`) and `src/view/internal/context-options.js` (import spacing).

The module loads source ES modules directly, and this change does not alter styles or bundled dependencies.
No CSS or vendor rebuild is required.

## In-world validation before declaring V14 verified

No disposable Foundry world was available during implementation. Accordingly, `module.json` retains
`compatibility.verified: "13"` and extends only `maximum` to `"14"`. V14 can load the module but may show an
unverified-compatibility warning. Update `verified` to the tested V14 build after completing this checklist.

Use a disposable world or a copy of an existing world on 14.367, with one GM and one player connected.
Repeat the key workflows on V13 if retaining the advertised minimum of V13.

- [ ] Enable the module; inspect the console during startup. Open the log through the journal button, scene controls,
  keybinding, and bundled macro. Re-render/pop out the journal sidebar and confirm only one button appears.
- [ ] Test the GM show-folder setting and the hide-from-players setting. Check the backing quest folder is filtered
  from ordinary journal folder choices where present.
- [ ] Create and edit a quest, switch statuses, add/edit/complete/delete tasks, and create/open subquests.
  Close and reopen the quest and reload the client to check persistence.
- [ ] Edit and save the description, GM notes, and player notes, including cleared content, formatting, links, and
  images. Confirm non-owner player notes reach the connected GM and persist without exposing GM notes.
- [ ] Submit ownership changes as GM and as a trusted player who owns the quest with trusted-player editing enabled.
  Check inherited/default permissions and visibility on the other client. Revoke edit permission while the dialog is open.
- [ ] Open an actor giver and an item reward, then open each again while its sheet is visible. Check the window gains
  focus. Close the quest and confirm sheets it opened close, while sheets already open beforehand remain open.
- [ ] Open splash and reward images repeatedly. Switch between rewards with different images; confirm the correct image
  appears, only one reward popout remains, locked rewards stay inaccessible to players, and GM image sharing still works.
- [ ] Open, move, resize, pin, unpin, and toggle the tracker. Expand/collapse the sidebar and resize the browser.
  Confirm the tracker remains positioned within its expected boundaries.
- [ ] Drag a quest to the canvas and hotbar; open its journal link and use Jump To Pin, including a scene with levels.
- [ ] Exercise deletion confirmations, reward drops to actor sheets, and updates between both connected clients.

Record the Foundry build, game system/version, browser, and any additional modules used when reporting these results.
