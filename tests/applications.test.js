import './helpers/foundry-stubs.js';
import assert from 'node:assert/strict';
import { test as nodeTest } from 'node:test';
import { Utils } from '../src/control/util/Utils.js';
import { QuestPreview } from '../src/view/preview/QuestPreview.js';
import { HandlerDetails } from '../src/view/preview/HandlerDetails.js';

globalThis.ui = { windows: {}, notifications: { error() {}, warn() {} } };
foundry.applications.instances = new Map();
globalThis.fromUuid = async () => null;

nodeTest('reopening an existing V2 sheet uses bringToFront without creating another window', async (t) =>
{
   let focused = false;
   const sheet = { rendered: true, bringToFront() { focused = true; } };
   t.mock.method(globalThis, 'fromUuid', async () => ({ sheet }));

   assert.equal(await Utils.showSheetFromUUID('Actor.giver', { permissionCheck: false }), null);
   assert.equal(focused, true);
});

nodeTest('quest preview closes sheets it opened from both Foundry application registries', async (t) =>
{
   const closedSheets = [];
   const legacy = { appId: 7, render() { this.rendered = true; }, close() { closedSheets.push('legacy'); } };
   const current = { id: 'item-reward', render() { this.rendered = true; }, close() { closedSheets.push('current'); } };
   t.mock.method(globalThis, 'fromUuid', async (uuid) => ({ sheet: uuid === 'Actor.giver' ? legacy : current }));
   ui.windows[7] = legacy;
   foundry.applications.instances.set(current.id, current);
   const preview = new QuestPreview({ id: 'quest' });
   preview._openedAppIds.push(
      await Utils.showSheetFromUUID('Actor.giver', { permissionCheck: false }),
      await Utils.showSheetFromUUID('Item.reward', { permissionCheck: false })
   );

   assert.deepEqual(preview._openedAppIds, [7, 'item-reward']);
   await preview.close({ noSave: true });
   assert.deepEqual(closedSheets, ['legacy', 'current']);
   delete ui.windows[7];
   foundry.applications.instances.clear();
});

class ImagePopoutStub
{
   constructor(options)
   {
      // Foundry freezes top-level ApplicationV2 options at construction.
      this.options = Object.freeze(options);
      this.rendered = false;
      this.focused = false;
   }

   render() { this.rendered = true; }
   bringToFront() { this.focused = true; }
   async close() { this.rendered = false; }
}

foundry.applications.apps.ImagePopout = ImagePopoutStub;
globalThis.$ = () => ({ data: () => 'reward' });

nodeTest('reward images reuse the same popout and replace it when the image changes', async () =>
{
   const event = { currentTarget: {}, stopPropagation() {} };
   const reward = { data: { img: 'first.webp' }, locked: false };
   const quest = { getReward: () => reward };
   const preview = { canEdit: false };

   await HandlerDetails.rewardShowImagePopout(event, quest, preview);
   const first = preview._rewardImagePopup;
   assert.equal(first.options.src, 'first.webp');
   assert.equal(first.rendered, true);

   await HandlerDetails.rewardShowImagePopout(event, quest, preview);
   assert.equal(preview._rewardImagePopup, first);
   assert.equal(first.focused, true);

   reward.data.img = 'second.webp';
   await HandlerDetails.rewardShowImagePopout(event, quest, preview);
   assert.equal(first.rendered, false);
   assert.notEqual(preview._rewardImagePopup, first);
   assert.equal(preview._rewardImagePopup.options.src, 'second.webp');
   assert.equal(preview._rewardImagePopup.rendered, true);
});

nodeTest('players cannot open locked reward images', async () =>
{
   const quest = { getReward: () => ({ data: { img: 'hidden.webp' }, locked: true }) };
   const preview = { canEdit: false };
   await HandlerDetails.rewardShowImagePopout({ stopPropagation() {} }, quest, preview);
   assert.equal(preview._rewardImagePopup, undefined);
});

nodeTest('rapid reward image changes only render the most recent popout after an animated close', async () =>
{
   let finishClose;
   const oldPopup = {
      rendered: true,
      options: Object.freeze({ src: 'first.webp' }),
      close: () => new Promise((resolve) => { finishClose = resolve; })
   };
   const preview = { canEdit: true, _rewardImagePopup: oldPopup };
   const reward = { data: { img: 'second.webp' } };
   const quest = { getReward: () => reward };
   const event = { stopPropagation() {} };
   const pending = HandlerDetails.rewardShowImagePopout(event, quest, preview);
   const second = preview._rewardImagePopup;

   reward.data.img = 'third.webp';
   await HandlerDetails.rewardShowImagePopout(event, quest, preview);
   const third = preview._rewardImagePopup;
   finishClose();
   await pending;

   assert.equal(second.rendered, false);
   assert.equal(third.rendered, true);
   assert.equal(third.options.src, 'third.webp');
   assert.equal(preview._rewardImagePopup, third);
});

nodeTest('closing a quest during image replacement does not reopen its popout', async () =>
{
   let finishClose;
   const preview = {
      canEdit: true,
      _rewardImagePopup: { close: () => new Promise((resolve) => { finishClose = resolve; }) }
   };
   const quest = { getReward: () => ({ data: { img: 'replacement.webp' } }) };
   const pending = HandlerDetails.rewardShowImagePopout({ stopPropagation() {} }, quest, preview);
   const replacement = preview._rewardImagePopup;

   await replacement.close();
   preview._rewardImagePopup = undefined;
   finishClose();
   await pending;

   assert.equal(replacement.rendered, false);
   assert.equal(preview._rewardImagePopup, undefined);
});

nodeTest('splash popouts use the V2 source option and can be brought forward again', async () =>
{
   const quest = { splash: 'splash.webp' };
   const preview = {};
   await HandlerDetails.splashImagePopupShow(quest, preview);
   const popup = preview._splashImagePopup;
   assert.equal(popup.options.src, quest.splash);
   assert.equal(popup.rendered, true);

   await HandlerDetails.splashImagePopupShow(quest, preview);
   assert.equal(preview._splashImagePopup, popup);
   assert.equal(popup.focused, true);
});
