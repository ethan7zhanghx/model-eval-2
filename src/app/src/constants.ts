// Behavior varies depending on whether the app is running as a static HTML app on the user's local machine.
export const IS_RUNNING_LOCALLY = !import.meta.env.VITE_IS_HOSTED;
export const IS_V1_MINIMAL_MODE =
  import.meta.env.MODE === 'test'
    ? import.meta.env.VITE_PROMPTFOO_V1_MINIMAL_MODE === 'true'
    : import.meta.env.VITE_PROMPTFOO_V1_MINIMAL_MODE !== 'false';

// Metadata keys that should be hidden from the user in the UI
export const HIDDEN_METADATA_KEYS = ['citations', '_promptfooFileMetadata'];
