#!/usr/bin/env node

// Simple test script to verify the AI library works correctly
import { getDefaultModel, generateCommand, getBenchmarkModels, generateBenchmarkText, getSystemInfo } from './lib/ai';

async function testAILibrary() {
  console.log('🧪 Testing AI Library...\n');

  // Test 1: Get system info
  console.log('1. Testing getSystemInfo():');
  const systemInfo = getSystemInfo();
  console.log('   System Info:', systemInfo);
  console.log('   ✅ System info retrieved\n');

  // Test 2: Get default model
  console.log('2. Testing getDefaultModel():');
  try {
    const modelConfig = getDefaultModel();
    console.log(`   Default model: ${modelConfig.provider}/${modelConfig.modelId}`);
    console.log('   ✅ Default model configuration loaded\n');

    // Test 3: Generate a simple command
    console.log('3. Testing generateCommand():');
    try {
      const command = await generateCommand('list files in current directory');
      console.log(`   Generated command: ${command}`);
      console.log('   ✅ Command generation successful\n');
    } catch (error) {
      console.log(`   ❌ Command generation failed: ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to get default model: ${error}\n`);
  }

  // Test 4: Get benchmark models
  console.log('4. Testing getBenchmarkModels():');
  const benchmarkModels = getBenchmarkModels();
  console.log(`   Available benchmark models: ${Object.keys(benchmarkModels).join(', ')}`);
  console.log('   ✅ Benchmark models loaded\n');

  // Test 5: Test benchmark text generation (with the first available model)
  console.log('5. Testing generateBenchmarkText():');
  const modelNames = Object.keys(benchmarkModels);
  if (modelNames.length > 0) {
    const firstModelName = modelNames[0];
    const firstModel = benchmarkModels[firstModelName];

    try {
      console.log(`   Testing with model: ${firstModelName}`);
      const result = await generateBenchmarkText(firstModel, 'show current directory');
      console.log(`   Generated result: ${result}`);
      console.log('   ✅ Benchmark text generation successful\n');
    } catch (error) {
      console.log(`   ❌ Benchmark text generation failed: ${error}\n`);
    }
  }

  console.log('🎉 AI Library test completed!');
}

// Run the test
testAILibrary().catch(console.error);
