// Minimal Foundry boundaries for unit tests. These stubs do not emulate a running Foundry world.
class ApplicationStub
{
   static RENDER_STATES = { RENDERING: 1, RENDERED: 2 };

   constructor(options = {})
   {
      this.options = options;
      this.position = { top: 0, left: 0, width: 600, height: 600 };
   }

   static get defaultOptions() { return {}; }

   render() { return this; }
   close() { return Promise.resolve(); }
}

class FormApplicationStub extends ApplicationStub
{
   constructor(object, options = {})
   {
      super(options);
      this.editors = {};
   }

   saveEditor() { return Promise.resolve(); }
}

class OwnershipConfigStub extends ApplicationStub
{
   constructor(options = {})
   {
      super(options);
      this.document = options.document;
   }
}

globalThis.foundry = {
   appv1: {
      api: { Application: ApplicationStub, FormApplication: FormApplicationStub, Dialog: ApplicationStub }
   },
   applications: {
      apps: { DocumentOwnershipConfig: OwnershipConfigStub },
      ux: { ContextMenu: class {} }
   },
   utils: { mergeObject: (target, source) => Object.assign(target, source) }
};

globalThis.DOMRect = class
{
   constructor(x, y, width, height)
   {
      Object.assign(this, { x, y, width, height });
   }
};

globalThis.game = {
   user: { isGM: true },
   settings: { get: () => false },
   i18n: { localize: (key) => key, format: (key) => key }
};

globalThis.Hooks = { once() {}, on() {}, callAll() {} };
