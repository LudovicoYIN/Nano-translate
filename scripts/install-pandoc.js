const fs = require('fs')
const fsp = require('fs/promises')
const https = require('https')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const extract = require('extract-zip')

const PANDOC_VERSION = process.env.PANDOC_VERSION || '3.8.2.1'
const RELEASE_API_URL = `https://api.github.com/repos/jgm/pandoc/releases/tags/${PANDOC_VERSION}`
const PROJECT_ROOT = path.resolve(__dirname, '..')
const PANDOC_ROOT = path.join(PROJECT_ROOT, 'resources', 'pandoc')
const FILTERS_DIR = path.join(PANDOC_ROOT, 'filters')
const VERSION_FILE = path.join(PANDOC_ROOT, 'version.json')
const FORCE_INSTALL = process.argv.includes('--force')

const PLATFORM_CONFIG = {
  darwin: {
    binaryName: 'pandoc',
    targetDir: `mac-${process.arch}`,
    assetPattern:
      process.arch === 'arm64' ? /arm64-macOS\.zip$/ : process.arch === 'x64' ? /x86_64-macOS\.zip$/ : null
  },
  win32: {
    binaryName: 'pandoc.exe',
    targetDir: `win-${process.arch}`,
    assetPattern: process.arch === 'x64' ? /windows-x86_64\.zip$/ : null
  },
  linux: {
    binaryName: 'pandoc',
    targetDir: `linux-${process.arch}`,
    assetPattern:
      process.arch === 'x64' ? /linux-amd64\.tar\.gz$/ : process.arch === 'arm64' ? /linux-arm64\.tar\.gz$/ : null
  }
}

const requestJson = url =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'nano-translate-pandoc-installer',
          Accept: 'application/vnd.github+json'
        }
      },
      res => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(requestJson(res.headers.location))
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`请求失败: ${res.statusCode} ${res.statusMessage || ''}`.trim()))
          return
        }

        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch (error) {
            reject(error)
          }
        })
      }
    )

    req.on('error', reject)
  })

const downloadFile = (url, destination) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination)
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'nano-translate-pandoc-installer'
        }
      },
      res => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close(() => {
            fs.unlink(destination, () => {
              resolve(downloadFile(res.headers.location, destination))
            })
          })
          return
        }

        if (res.statusCode !== 200) {
          file.close(() => {
            fs.unlink(destination, () => {
              reject(new Error(`下载失败: ${res.statusCode} ${res.statusMessage || ''}`.trim()))
            })
          })
          return
        }

        res.pipe(file)
        file.on('finish', () => file.close(resolve))
      }
    )

    req.on('error', error => {
      file.close(() => {
        fs.unlink(destination, () => reject(error))
      })
    })
  })

const runTarExtract = (archivePath, outputDir) =>
  new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archivePath, '-C', outputDir], {
      stdio: 'inherit'
    })
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`tar 解压失败，退出码 ${code}`))
    })
  })

const findFile = async (rootDir, fileName) => {
  const entries = await fsp.readdir(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isFile() && entry.name === fileName) {
      return fullPath
    }
    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, fileName)
      if (nested) {
        return nested
      }
    }
  }
  return null
}

const ensureInstalled = async () => {
  const platformConfig = PLATFORM_CONFIG[process.platform]
  if (!platformConfig || !platformConfig.assetPattern) {
    throw new Error(`当前平台或架构暂不支持自动安装 Pandoc: ${process.platform} ${process.arch}`)
  }

  const targetDir = path.join(PANDOC_ROOT, platformConfig.targetDir)
  const targetBinary = path.join(targetDir, platformConfig.binaryName)

  if (!FORCE_INSTALL) {
    const installedVersion = await fsp
      .readFile(VERSION_FILE, 'utf8')
      .then(content => JSON.parse(content))
      .catch(() => null)

    const binaryExists = await fsp
      .access(targetBinary)
      .then(() => true)
      .catch(() => false)

    if (binaryExists && installedVersion?.version === PANDOC_VERSION) {
      console.log(`[pandoc] 已安装 ${PANDOC_VERSION}，跳过下载`)
      return
    }
  }

  console.log(`[pandoc] 获取 ${PANDOC_VERSION} 发布信息`)
  const release = await requestJson(RELEASE_API_URL)
  const asset = release.assets.find(item => platformConfig.assetPattern.test(item.name))
  if (!asset) {
    throw new Error(`未找到适用于 ${process.platform} ${process.arch} 的 Pandoc 安装包`)
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nano-pandoc-install-'))
  const archivePath = path.join(tempDir, asset.name)
  const extractDir = path.join(tempDir, 'extract')
  await fsp.mkdir(extractDir, { recursive: true })

  try {
    console.log(`[pandoc] 下载 ${asset.browser_download_url}`)
    await downloadFile(asset.browser_download_url, archivePath)

    console.log('[pandoc] 解压安装包')
    if (archivePath.endsWith('.zip')) {
      await extract(archivePath, { dir: extractDir })
    } else if (archivePath.endsWith('.tar.gz')) {
      await runTarExtract(archivePath, extractDir)
    } else {
      throw new Error(`不支持的安装包格式: ${asset.name}`)
    }

    const extractedBinary = await findFile(extractDir, platformConfig.binaryName)
    if (!extractedBinary) {
      throw new Error(`解压后未找到 ${platformConfig.binaryName}`)
    }

    const extractedFilter = await findFile(extractDir, 'raw-html-to-native.lua')
    await fsp.mkdir(targetDir, { recursive: true })
    await fsp.mkdir(FILTERS_DIR, { recursive: true })
    await fsp.copyFile(extractedBinary, targetBinary)
    if (process.platform !== 'win32') {
      await fsp.chmod(targetBinary, 0o755)
    }

    if (extractedFilter) {
      await fsp.copyFile(extractedFilter, path.join(FILTERS_DIR, 'raw-html-to-native.lua'))
    }

    await fsp.writeFile(
      VERSION_FILE,
      JSON.stringify(
        {
          version: PANDOC_VERSION,
          platform: process.platform,
          arch: process.arch,
          assetName: asset.name
        },
        null,
        2
      ) + '\n',
      'utf8'
    )

    console.log(`[pandoc] 安装完成: ${targetBinary}`)
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

ensureInstalled().catch(error => {
  console.error(`[pandoc] 安装失败: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
