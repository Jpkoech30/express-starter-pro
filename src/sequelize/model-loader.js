'use strict';

const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');

async function loadModels(sequelize, globPattern) {
  const models = {};
  const baseDir = process.cwd();
  const pattern = globPattern || 'models/**/*.js';

  const parts = pattern.split(/[\\/]/);
  const modelsDir = path.resolve(baseDir, parts[0]);

  if (!fs.existsSync(modelsDir)) {
    return models;
  }

  const modelFiles = findModelFiles(modelsDir, parts.slice(1));

  for (const filePath of modelFiles) {
    try {
      const modelDef = require(filePath);
      if (typeof modelDef === 'function') {
        const model = modelDef(sequelize, DataTypes);
        if (model && model.name) {
          models[model.name] = model;
        }
      }
    } catch (err) {
      console.warn(`Failed to load model ${filePath}: ${err.message}`);
    }
  }

  Object.values(models).forEach((model) => {
    if (typeof model.associate === 'function') {
      model.associate(models);
    }
  });

  return models;
}

function findModelFiles(dir, patternParts) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findModelFiles(fullPath, patternParts));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (_) {
    // directory doesn't exist
  }
  return files;
}

module.exports = { loadModels };
