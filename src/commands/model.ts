import { confirm, isCancel, outro, intro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { installBundledModel, isBundledModelInstalled, removeBundledModel } from '../lib/bundled-model';
import { installedBundledState, loadConfig, saveConfig, type Config } from '../lib/config';
import { BUNDLED_MODEL } from '../lib/local-models';
import { info, print } from '../utils';

function formatMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(0)} MB`;
}

export async function installBundledModelCommand(): Promise<void> {
  intro(chalk.blue('LazyShell bundled model'));
  await print(
    chalk.gray(`${BUNDLED_MODEL.displayName} · ${formatMb(BUNDLED_MODEL.sizeBytes)} · ${BUNDLED_MODEL.license}`)
  );

  if (await isBundledModelInstalled()) {
    await persistInstalled();
    outro(chalk.green('Bundled model is already installed.'));
    return;
  }

  const spin = spinner();
  spin.start(`Downloading ${BUNDLED_MODEL.filename}...`);
  try {
    await installBundledModel((downloaded, total) => {
      if (total > 0) {
        spin.message(`Downloading ${formatMb(downloaded)} / ${formatMb(total)}`);
      }
    });
    await persistInstalled();
    spin.stop('Download complete and checksum verified.');
    outro(chalk.green('Bundled model installed. Use provider "bundled" or run LazyShell offline.'));
  } catch (error) {
    spin.stop('Download failed.');
    outro(chalk.red(String(error)));
    process.exitCode = 1;
  }
}

export async function removeBundledModelCommand(): Promise<void> {
  intro(chalk.blue('Remove bundled model'));

  if (!(await isBundledModelInstalled())) {
    await persistStatus('declined');
    outro(chalk.yellow('No bundled model is installed.'));
    return;
  }

  const confirmed = await confirm({
    message: `Delete ~/.lazyshell/models/${BUNDLED_MODEL.filename}?`,
    initialValue: false,
  });

  if (isCancel(confirmed) || !confirmed) {
    outro(chalk.gray('Removal cancelled.'));
    return;
  }

  await removeBundledModel();
  await persistStatus('declined');
  await info(chalk.green('Bundled model removed.'));
  outro(chalk.gray('Run `lazyshell model install` to download it again.'));
}

async function persistInstalled(): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    return;
  }
  config.bundledModel = installedBundledState();
  if (config.provider === 'bundled') {
    config.model = BUNDLED_MODEL.id;
  }
  await saveConfig(config);
}

async function persistStatus(status: NonNullable<Config['bundledModel']>['status']): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    return;
  }
  config.bundledModel = { status };
  if (status !== 'installed' && config.provider === 'bundled') {
    config.provider = 'ollama';
    config.model = undefined;
  }
  await saveConfig(config);
}
