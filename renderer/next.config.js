/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    // 在构建时忽略 ESLint 报错，避免打包被阻塞
    ignoreDuringBuilds: true
  },
  webpack: config => {
    return config
  }
}
