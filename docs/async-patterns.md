# Async Function Patterns

This document explains different approaches for using async functions in various contexts.

## The Problem

When you have an async function that you need to use in a synchronous context, you'll encounter TypeScript errors because `Promise<T>` is not assignable to `T`.

```typescript
// ❌ This doesn't work
function syncFunction() {
  const result = asyncFunction(); // Type error: Promise<string> is not assignable to string
  return { data: result };
}
```

## Solutions

### 1. Make the Calling Function Async (Recommended)

The cleanest approach is to make the calling function async:

```typescript
// ✅ Clean async approach
async function asyncFunction(): Promise<string> {
  return "async result";
}

async function callingFunction() {
  const result = await asyncFunction();
  return { data: result };
}
```

### 2. Provide Sync and Async Versions

When you need both immediate and detailed results:

```typescript
// ✅ Dual approach - sync for immediate use, async for detailed info
function getBasicInfo() {
  return {
    cpu: 'Intel i7',
    memory: '16GB',
    gpu: 'Detecting...' // Placeholder
  };
}

async function getDetailedInfo() {
  return {
    cpu: 'Intel i7',
    memory: '16GB', 
    gpu: await getGpuInfo() // Actual async GPU detection
  };
}
```

### 3. Use Promises with .then() (Not Recommended)

```typescript
// ❌ Avoid this pattern - makes code harder to read
function syncFunction() {
  asyncFunction().then(result => {
    // Handle result here, but you can't return it synchronously
  });
}
```

### 4. Fire-and-Forget Pattern

For background operations that don't need to block:

```typescript
// ✅ For background operations
function initializeApp() {
  // Start async operation but don't wait
  updateCacheInBackground().catch(console.error);
  
  // Return immediately with basic info
  return getBasicAppInfo();
}

async function updateCacheInBackground() {
  // Long-running async operation
}
```

## Best Practices

1. **Prefer async/await**: Make functions async when they need async operations
2. **Provide fallbacks**: Offer immediate basic info and detailed async info
3. **Handle errors**: Always handle Promise rejections
4. **Document behavior**: Make it clear which functions are sync vs async
5. **Use TypeScript**: Let the type system guide your decisions

## Example: Hardware Detection

Our hardware detection uses the dual approach:

```typescript
// Immediate basic info
const basicHardware = getHardwareInfo();

// Detailed info when needed
const detailedHardware = await getDetailedHardwareInfo();
```

This allows the system to start immediately with basic info while optionally getting detailed GPU information asynchronously. 