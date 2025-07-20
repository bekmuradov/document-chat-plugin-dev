// Mock CSS and other asset imports for testing
require.extensions['.css'] = () => {};
require.extensions['.scss'] = () => {};
require.extensions['.sass'] = () => {};
require.extensions['.less'] = () => {};
require.extensions['.png'] = () => {};
require.extensions['.jpg'] = () => {};
require.extensions['.jpeg'] = () => {};
require.extensions['.gif'] = () => {};
require.extensions['.svg'] = () => {};

// Mock React DOM for server-side testing
const mockDOM = {
  createRoot: () => ({
    render: () => {},
    unmount: () => {}
  })
};

// Make DOM mocks available globally if needed
global.document = global.document || {};
global.window = global.window || {};

console.log('✓ Test environment setup complete - CSS and assets mocked');
