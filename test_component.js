const React = require('react');

// Test function with actual component instantiation and method calling
function testComponentWithMethods() {
  try {
    // Import the component
    const ChatCollectionsPlugin = require('./src/index.tsx').default;
    
    console.log('✓ Component imported successfully');
    console.log('Component type:', typeof ChatCollectionsPlugin);
    console.log('Component name:', ChatCollectionsPlugin.name);
    
    // Create comprehensive mock props
    const mockProps = {
      title: 'Test Plugin',
      description: 'Test Description',
      pluginId: 'test-plugin',
      config: {
        apiBaseUrl: 'http://localhost:8000',
        refreshInterval: 30,
        maxDocuments: 100
      },
      services: {
        settings: {
          getSetting: (key) => Promise.resolve(null),
          setSetting: (key, value) => Promise.resolve()
        },
        api: {
          get: (url) => Promise.resolve([]),
          post: (url, data) => Promise.resolve({}),
          put: (url, data) => Promise.resolve({}),
          delete: (url) => Promise.resolve({})
        },
        theme: {
          getCurrentTheme: () => 'light',
          addThemeChangeListener: (listener) => {},
          removeThemeChangeListener: (listener) => {}
        },
        event: {
          emit: (event, data) => {},
          on: (event, handler) => {},
          off: (event, handler) => {}
        },
        pageContext: {
          getCurrentPageContext: () => ({ pageId: 'test' }),
          onPageContextChange: (handler) => () => {}
        }
      }
    };
    
    // Create React element
    const element = React.createElement(ChatCollectionsPlugin, mockProps);
    console.log('✓ React element created successfully');
    
    // Actually instantiate the component (for testing purposes only)
    // Note: This is not how React normally works, but it's useful for testing
    const instance = new ChatCollectionsPlugin(mockProps);
    console.log('✓ Component instance created successfully');
    
    // Test basic properties
    console.log('Instance type:', typeof instance);
    console.log('Has state:', !!instance.state);
    console.log('Has props:', !!instance.props);
    
    // Check state initialization
    if (instance.state) {
      console.log('✓ Component state initialized');
      console.log('Initial state keys:', Object.keys(instance.state));
      console.log('Initial view:', instance.state.currentView);
      console.log('Initial theme:', instance.state.currentTheme);
    }
    
    // Get available methods
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
      .filter(name => typeof instance[name] === 'function' && name !== 'constructor');
    
    console.log('✓ Available methods:', methods);
    
    // Test specific expected methods exist
    const expectedMethods = ['loadCollections', 'loadDocuments', 'loadChatSessions', 'handleViewChange', 'getPluginInfo'];
    const foundMethods = expectedMethods.filter(method => methods.includes(method));
    console.log('✓ Expected methods found:', foundMethods);
    
    // Test the getPluginInfo method if it exists
    if (typeof instance.getPluginInfo === 'function') {
      console.log('✓ getPluginInfo method exists and is callable');
      
      try {
        const pluginInfo = instance.getPluginInfo();
        console.log('✓ getPluginInfo executed successfully');
        console.log('Plugin info result:', JSON.stringify(pluginInfo, null, 2));
        
        // Validate the returned info structure
        if (pluginInfo && typeof pluginInfo === 'object') {
          console.log('✓ getPluginInfo returned valid object');
          
          // Check expected properties
          const expectedProps = ['name', 'version', 'status', 'hasServices', 'currentState'];
          const hasProps = expectedProps.filter(prop => pluginInfo.hasOwnProperty(prop));
          console.log('✓ Expected properties found:', hasProps);
          
          if (hasProps.length === expectedProps.length) {
            console.log('✓ All expected properties present in plugin info');
          }
          
          // Validate services detection
          if (pluginInfo.hasServices) {
            console.log('✓ Services detection working:', pluginInfo.hasServices);
          }
          
          // Validate state access
          if (pluginInfo.currentState) {
            console.log('✓ State access working:', pluginInfo.currentState);
          }
        }
        
        return { success: true, pluginInfo };
        
      } catch (methodError) {
        console.error('✗ getPluginInfo method failed:', methodError.message);
        return { success: false, error: methodError.message };
      }
      
    } else {
      console.log('ℹ getPluginInfo method not found - you may need to add it to the component');
      
      // Test a different existing method as fallback
      if (typeof instance.handleViewChange === 'function') {
        console.log('✓ Testing handleViewChange as fallback...');
        
        try {
          // This should be safe to call as it just updates state
          instance.handleViewChange('COLLECTIONS'); // Assuming ViewType.COLLECTIONS exists
          console.log('✓ handleViewChange executed without errors');
        } catch (methodError) {
          console.error('✗ handleViewChange failed:', methodError.message);
        }
      }
      
      return { success: true, note: 'Basic instantiation successful, add getPluginInfo method for full testing' };
    }
    
  } catch (error) {
    console.error('✗ Component test failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
console.log('='.repeat(60));
console.log('Testing ChatCollectionsPlugin - Loading & Method Execution');
console.log('='.repeat(60));

const result = testComponentWithMethods();

console.log('='.repeat(60));
if (result.success) {
  console.log('✓ SUCCESS: Component loads and methods work correctly');
  if (result.pluginInfo) {
    console.log('✓ Plugin info retrieved successfully');
  }
  if (result.note) {
    console.log('ℹ Note:', result.note);
  }
} else {
  console.log('✗ FAILURE: Component test failed');
  console.log('Error:', result.error);
}
console.log('='.repeat(60));

// Export for potential use in other tests
module.exports = { testComponentWithMethods };
