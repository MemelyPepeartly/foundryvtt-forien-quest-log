import assert from 'node:assert/strict';
import { test as nodeTest } from 'node:test';

// Ownership configuration uses the ApplicationV2 form-handler contract in both Foundry V13 and V14.
globalThis.foundry = {
   applications: {
      apps: {
         DocumentOwnershipConfig: class
         {
            constructor({ document }) { this.document = document; }
         }
      }
   }
};
globalThis.CONST = { DOCUMENT_META_OWNERSHIP_LEVELS: { DEFAULT: -1 } };
globalThis.game = { user: { id: 'trusted-owner', isGM: false, isTrusted: true } };

const { FQLDocumentOwnershipConfig } = await import('../src/view/internal/FQLDocumentOwnershipConfig.js');

nodeTest('the V2 form handler updates ownership for a trusted owner and removes inherited user overrides', async () =>
{
   const updates = [];
   const document = {
      canUserModify(user, action)
      {
         assert.equal(user, game.user);
         assert.equal(action, 'update');
         return true;
      },
      async update(data, options)
      {
         updates.push({ data, options });
         return this;
      }
   };
   const app = new FQLDocumentOwnershipConfig({ document });
   const formData = { object: { default: 0, owner: 3, observer: 2, inherited: -1, hidden: 0 } };

   const result = await FQLDocumentOwnershipConfig.DEFAULT_OPTIONS.form.handler.call(app, null, null, formData);

   assert.equal(result, document);
   assert.deepEqual(updates, [{
      data: { ownership: { default: 0, owner: 3, observer: 2, hidden: 0 } },
      options: { diff: false, recursive: false, noHook: true }
   }]);
   assert.equal(formData.object.inherited, -1);
});

nodeTest('the V2 form handler checks document permission again when submitting an open dialog', async () =>
{
   let canUpdate = true;
   let updates = 0;
   const document = {
      canUserModify: () => canUpdate,
      async update() { updates++; }
   };
   const app = new FQLDocumentOwnershipConfig({ document });
   canUpdate = false;

   await assert.rejects(
      FQLDocumentOwnershipConfig.DEFAULT_OPTIONS.form.handler.call(app, null, null, { object: { default: 3 } }),
      /permission/
   );
   assert.equal(updates, 0);
});
