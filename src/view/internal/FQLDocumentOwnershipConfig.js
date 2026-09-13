/**
 * Provides quest ownership configuration for GMs and trusted players with edit capabilities.
 *
 * When the underlying document / {@link JournalEntry} is updated the {@link QuestDB} will receive this update and
 * fire {@link QuestDBHooks} that other parts of FQL can respond to handle as necessary. In particular
 * {@link ViewManager} handles these hooks to update the GUI on local and remote clients when ownership change.
 */
export class FQLDocumentOwnershipConfig extends foundry.applications.apps.DocumentOwnershipConfig // eslint-disable-line no-undef
{
   /** @override */
   static DEFAULT_OPTIONS = {
      form: { handler: FQLDocumentOwnershipConfig.#onSubmitOwnership }
   };

   /**
    * DocumentOwnershipConfig has its own form handler; ApplicationV2 does not call the legacy `_updateObject`.
    * Keep the quest ownership update available to users who can update the backing journal entry.
    *
    * @param {SubmitEvent}      event - The form submission event.
    *
    * @param {HTMLFormElement}  form - The submitted form.
    *
    * @param {FormDataExtended} formData - The processed ownership fields.
    *
    * @returns {Promise<JournalEntry>} The updated journal entry.
    */
   static async #onSubmitOwnership(event, form, formData)
   {
      if (!this.document.canUserModify(game.user, 'update'))
      {
         throw new Error('You do not have permission to update this quest.');
      }

      // Collect new ownership levels from the form data
      const omit = CONST.DOCUMENT_META_OWNERSHIP_LEVELS.DEFAULT;
      const ownershipLevels = {};

      for (const [user, level] of Object.entries(formData.object))
      {
         if (level === omit)
         {
            delete ownershipLevels[user];
            continue;
         }
         ownershipLevels[user] = level;
      }

      // Update a single Document
      return this.document.update({ ownership: ownershipLevels }, { diff: false, recursive: false, noHook: true });
   }
}
