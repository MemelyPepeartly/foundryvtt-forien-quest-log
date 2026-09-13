import './helpers/foundry-stubs.js';
import assert from 'node:assert/strict';
import { test as nodeTest } from 'node:test';
import { FoundryUIManager } from '../src/control/ui/FoundryUIManager.js';
import { ViewManager } from '../src/control/ui/ViewManager.js';

nodeTest('tracker docks at the sidebar top and handles a sidebar that starts collapsed', (t) =>
{
   const originalWindow = globalThis.window;
   const originalUI = globalThis.ui;
   t.after(() =>
   {
      globalThis.window = originalWindow;
      globalThis.ui = originalUI;
   });

   let sidebarRect = { top: 24, left: 1160, width: 40, height: 700 };
   const sidebarElement = { getBoundingClientRect: () => sidebarRect };
   globalThis.ui = {
      sidebar: { expanded: false, element: sidebarElement },
      hotbar: { element: { getBoundingClientRect: () => ({ top: 740, left: 100, width: 700, height: 50 }) } },
      controls: { element: { getBoundingClientRect: () => ({ top: 24, left: 16, width: 80, height: 400 }) } }
   };
   globalThis.window = {
      addEventListener() {},
      getComputedStyle(element)
      {
         const rect = element.getBoundingClientRect();
         // Collapsed and expanded sidebars may have different pseudo-element bounds.
         const width = rect.width + (element === sidebarElement && !ui.sidebar.expanded ? 20 : 0);
         return { getPropertyValue: (name) => String(name === 'width' ? width : rect.height) };
      }
   };

   const tracker = {
      pinned: true,
      rendered: false,
      _state: foundry.appv1.api.Application.RENDER_STATES.RENDERING,
      position: { top: 100, left: 400, width: 296, height: 400 },
      setPosition: t.mock.fn()
   };
   t.mock.getter(ViewManager, 'questTracker', () => tracker);
   const hooks = t.mock.method(Hooks, 'on');
   let refresh;
   t.mock.method(globalThis, 'setTimeout', (callback) => { refresh = callback; return 0; });

   FoundryUIManager.init();
   const position = { ...tracker.position };
   assert.equal(FoundryUIManager.checkPosition(position), true);
   assert.equal(position.top, 24);
   assert.equal(position.left, 836);
   assert.equal(FoundryUIManager.boundaries.rectDock.y, 24);

   const collapseHook = hooks.mock.calls.find((call) => call.arguments[0] === 'collapseSidebar').arguments[1];
   ui.sidebar.expanded = true;
   sidebarRect = { top: 24, left: 900, width: 300, height: 700 };
   collapseHook(ui.sidebar, false);
   refresh();

   assert.equal(FoundryUIManager.boundaries.top, 24);
   assert.equal(FoundryUIManager.boundaries.right, 900);
   assert.equal(tracker.setPosition.mock.callCount(), 1);
   assert.equal(tracker.setPosition.mock.calls[0].arguments[0].top, 24);
   assert.equal(tracker.setPosition.mock.calls[0].arguments[0].left, 596);
});
