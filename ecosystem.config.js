{
  "apps": [
    {
      "name": "condo360-backend",
      "script": "server.js",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "production",
        "PORT": 6000
      },
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 6000
      },
      "log_file": "./logs/combined.log",
      "out_file": "./logs/out.log",
      "error_file": "./logs/error.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "merge_logs": true,
      "max_memory_restart": "1G",
      "node_args": "--max-old-space-size=1024",
      "restart_delay": 4000,
      "max_restarts": 10,
      "min_uptime": "10s",
      "watch": false,
      "ignore_watch": [
        "node_modules",
        "logs",
        "temp"
      ],
      "watch_options": {
        "followSymlinks": false
      }
    }
  ]
}
