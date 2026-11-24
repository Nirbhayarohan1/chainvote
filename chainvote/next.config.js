/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: true, experimental: { serverComponentsExternalPackages: ["mongoose", "ethers", "merkletreejs"] }, eslint: { ignoreDuringBuilds: true } };
