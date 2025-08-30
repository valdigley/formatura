module.exports = {
  apps: [{
    name: 'foto-formatura',
    script: 'npx',
    args: 'serve -s dist -l 8080',
    cwd: '/opt/foto-formatura',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};