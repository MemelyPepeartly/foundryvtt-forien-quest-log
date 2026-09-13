import './helpers/foundry-stubs.js';
import assert from 'node:assert/strict';
import { test as nodeTest } from 'node:test';
import { FQLHooks } from '../src/control/FQLHooks.js';
import { Utils } from '../src/control/util/Utils.js';
import { ViewManager } from '../src/control/ui/ViewManager.js';

/**
 * Model only the DOM operations used by the directory hook, including native null results.
 *
 * @param {object} options - Whether the directory already contains a footer or quest folder.
 *
 * @param {boolean} options.existingFooter - Include the core directory footer.
 *
 * @param {boolean} options.existingFolder - Include the quest storage folder.
 *
 * @returns {object} The directory DOM fixture.
 */
function directoryFixture({ existingFooter = false, existingFolder = false } = {})
{
   const created = [];
   const ownerDocument = {
      createElement(tagName)
      {
         const element = {
            tagName,
            classList: { add() {} },
            children: [],
            listeners: {},
            append(child) { this.children.push(child); },
            addEventListener(name, listener) { this.listeners[name] = listener; }
         };
         created.push(element);
         return element;
      }
   };
   let footer = existingFooter ? ownerDocument.createElement('footer') : null;
   let folder = existingFolder ? { remove() { folder = null; } } : null;

   const html = {
      ownerDocument,
      querySelector(selector)
      {
         if (selector === '.directory-footer') { return footer; }
         if (selector === '.quest-log-btn') { return footer?.children[0] ?? null; }
         if (selector === '.folder[data-folder-id="quest-folder"]') { return folder; }
         throw new Error(`Unexpected selector: ${selector}`);
      },
      append(element) { footer = element; }
   };

   return { html, created, get footer() { return footer; }, get folder() { return folder; } };
}

nodeTest('journal hooks register the current and legacy journal sheet render events', (t) =>
{
   const hooks = t.mock.method(Hooks, 'on');
   FQLHooks.init();
   const registrations = new Map(hooks.mock.calls.map((call) => call.arguments));
   assert.equal(registrations.get('renderJournalEntrySheet'), FQLHooks.renderJournalSheet);
   assert.equal(registrations.get('renderJournalSheet'), FQLHooks.renderJournalSheet);
});

nodeTest('directory rendering creates a missing footer and does not duplicate its working button', (t) =>
{
   t.mock.method(Utils, 'getQuestFolder', () => ({ id: 'quest-folder' }));
   const render = t.mock.fn();
   t.mock.getter(ViewManager, 'questLog', () => ({ render }));
   const fixture = directoryFixture();

   FQLHooks.renderJournalDirectory({}, fixture.html);
   FQLHooks.renderJournalDirectory({}, fixture.html);

   assert.equal(fixture.footer.tagName, 'footer');
   assert.equal(fixture.footer.children.length, 1);
   assert.equal(fixture.created.filter((element) => element.tagName === 'button').length, 1);
   const button = fixture.footer.children[0];
   assert.equal(button.type, 'button');
   button.listeners.click();
   assert.deepEqual(render.mock.calls[0].arguments, [true]);
});

nodeTest('directory rendering preserves its existing footer and hides the quest storage folder', (t) =>
{
   t.mock.method(Utils, 'getQuestFolder', () => ({ id: 'quest-folder' }));
   const fixture = directoryFixture({ existingFooter: true, existingFolder: true });
   const footer = fixture.footer;

   FQLHooks.renderJournalDirectory({}, fixture.html);

   assert.equal(fixture.footer, footer);
   assert.equal(fixture.footer.children.length, 1);
   assert.equal(fixture.folder, null);
});

nodeTest('the GM show-folder setting preserves the quest storage folder', (t) =>
{
   t.mock.method(game.settings, 'get', (moduleName, key) => key === 'showFolder');
   const fixture = directoryFixture({ existingFolder: true });

   FQLHooks.renderJournalDirectory({}, fixture.html);

   assert.ok(fixture.folder);
});

nodeTest('players with a hidden quest log do not receive a directory button', (t) =>
{
   t.mock.method(game.settings, 'get', (moduleName, key) => key === 'hideFQLFromPlayers');
   t.mock.method(Utils, 'getQuestFolder', () => ({ id: 'quest-folder' }));
   const originalUser = game.user;
   game.user = { isGM: false };
   t.after(() => { game.user = originalUser; });
   const fixture = directoryFixture({ existingFolder: true });

   FQLHooks.renderJournalDirectory({}, fixture.html);

   assert.equal(fixture.footer, null);
   assert.equal(fixture.folder, null);
});

nodeTest('journal folder filtering accepts native elements and legacy jQuery wrappers', (t) =>
{
   t.mock.method(Utils, 'getQuestFolder', () => ({ id: 'quest-folder' }));
   const remove = t.mock.fn();
   const html = {
      // Native HTMLFormElement[0] is its first control, not a jQuery wrapper's root.
      0: { querySelectorAll: () => [] },
      querySelectorAll(selector)
      {
         assert.equal(selector, 'select[name="folder"] option[value="quest-folder"]');
         return [{ remove }];
      }
   };

   FQLHooks.renderJournalSheet({}, html);
   FQLHooks.renderJournalSheet({}, { jquery: '3.7.1', 0: html });

   assert.equal(remove.mock.callCount(), 2);
});

nodeTest('journal rendering tolerates a missing folder selector or uninitialized quest storage', (t) =>
{
   t.mock.method(Utils, 'getQuestFolder', () => ({ id: 'quest-folder' }));
   FQLHooks.renderJournalSheet({}, { querySelectorAll: () => [] });

   t.mock.method(Utils, 'getQuestFolder', () => void 0);
   FQLHooks.renderJournalSheet({}, {});
});
