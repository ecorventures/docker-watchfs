# ecor/watchfs

This container monitors any number of directories or files for changes. When
changes occur, a handler script can be run. For example, if you want to backup
a file after it changes, this container provides a means to do so.

The container is built on Alpine Linux with Node.js installed. Node is used for
consistent file monitoring.

## Example

The example can be run using the `example/runner` script. The `runner` script
sets up the `docker run` command to monitor two directories;
`example/watchme` and `example/watchme2`.

```sh
λ ~/Workspace/Images/watchfs/example/ ./runner
Monitoring: /Users/cbutler/Workspace/Images/watchfs/example/watchme and /Users/cbutler/Workspace/Images/watchfs/example/watchme2
Handler: /Users/cbutler/Workspace/Images/watchfs/example/handler.sh

> watchfs@0.0.1 start /app
> node index.js

Now monitoring /watch with /handler.sh
Now monitoring /watch2 with /handler.sh
```

Now it's possible to add a file and have a script respond to it. The example
`handler.sh` script looks like:

```sh
#!/bin/sh
echo "Handler executed for $1 $2"
```

Two arguments are passed to the handler script. The first is the event type,
which is `create`, `modify`, or `delete`. The second is the full path to the
file that triggered the event.

For example, run `echo "test" > /Users/cbutler/Workspace/Images/watchfs/example/watchme/test.txt`:

```sh
λ ~/Workspace/Images/watchfs/example/ ./runner
Monitoring: /Users/cbutler/Workspace/Images/watchfs/example/watchme and /Users/cbutler/Workspace/Images/watchfs/example/watchme2
Handler: /Users/cbutler/Workspace/Images/watchfs/example/handler.sh

> watchfs@0.0.1 start /app
> node index.js

Now monitoring /watch with /handler.sh
Now monitoring /watch2 with /handler.sh
Handler executed for create /watch/test.txt # <------ Output
```

## Usage

Understanding how to use the monitor is more about how to setup the `docker run`
command than anything else. This is found in the `example/runner` helper script.

```docker
handler="`pwd`/handler.sh"
monitorDirectory="`pwd`/watchme"
altMonitorDirectory="`pwd`/watchme2"

docker run --rm --name monitor \
  -v "$monitorDirectory" \
  -v "$altMonitorDirectory" \
  -v "$handler" \
  -e "MONITOR1=$monitorDirectory" \
  -e "MONITOR1_HANDLER=$handler" \
  -e "MONITOR2=$altMonitorDirectory" \
  -e "MONITOR2_HANDLER=$handler" \
  ecor/watchfs
```

Notice there are 4 environment variables and **3** volumes specified. While this
is verbose, it is necessary to maintain an isolated environment.

Here's what each variable/volume refers to:

### Volumes

- `-v "$monitorDirectory"`: The first monitored directory.
- `-v "$altMonitorDirectory"`: The second monitored directory.
- `-v "$handler"`: The handler/script to respond to file system events with.

### Environment Variables

- `-e "MONITOR1=$monitorDirectory"`: The first monitored directory.
- `-e "MONITOR1_HANDLER=$handler"`: The handler script for this first monitored
  directory.
- `-e "MONITOR2=$altMonitorDirectory"`: The second monitored directory.
- `-e "MONITOR2_HANDLER=$handler"`: The handler script for the 2nd monitored
  directory. Since the example script can handle both directories, this is the
  same as the handler for the first monitored directory. This can point to
  a different script though.

## Customization

It is possible to monitor any number of directories. First, specify the directory
as a volume in the `docker run` command, i.e. `-v "/path/to/directory"`.

Each monitored directory needs two environment variables. The syntax is:

1. `MONITOR<#><anything>` to identify the directory to be monitored.
1. `MONITOR<#><anything>_HANDLER` to identify the script to execute when
  the monitor detects a change.

`<#>` is a unique number, such as `1`, `2`, `3`, etc.

Using the example, if you wanted to monitor a third directory, you would add:

```
  -v "/path/to/monitored/directory" \
  -e "MONITOR3=/path/to/monitored/directory" \
  -e "MONITOR3_HANDLER=/path/to/handler.sh" \
```

If you want more meaningful environment variable names, customize it. For
example, `MONITOR3_MY_BACKUPDIR` and `MONITOR3_MY_BACKUPDIR_HANDLER` are valid.
The only important part of the syntax is the beginning and end. The directory to
be monitored should always start with `MONITOR<#>` while the handler just adds
`_HANDLER` to the end of the variable.

## Remember Permissions

The directories must be readable, and the handler must be executable. While this
seems obvious, it is easy to overlook.

# Running as a Service/Daemon

On systemd-capable Linux systems like CoreOS, CentOS 7+, and Ubuntu, it is
easy to setup monitoring using a systemd file.

```sh
[Unit]
Description=My Directory Monitor
Requires=docker.service
After=docker.service

[Service]
Restart=always
RestartSec=10
ExecStartPre=/usr/bin/docker pull ecor/watchfs
ExecStart=/usr/bin/docker run --rm --name monitor \
  -v "/directory/to/monitor" \
  -v "/directory/to/monitor2" \
  -v "/path/to/handler.sh" \
  -v "/path/to/another/handler.sh" \
  -e "MONITOR1=/directory/to/monitor" \
  -e "MONITOR1_HANDLER=/path/to/handler.sh" \
  -e "MONITOR2=/directory/to/monitor2" \
  -e "MONITOR2_HANDLER=/path/to/another/handler.sh" \
  ecor/watchfs
ExecStop=/usr/bin/docker stop monitor

[Install]
WantedBy=default.target
```

# Known Issue

Why do I see `MONITOR1_HANDLER (/path/to/handler.sh) is not not a recognized executable. Check the file exists and has execute permissions.`?

If you specify a handler directly as a volume (i.e. `-v /path/to/handler.sh`)
and are certain the file exists with appropriate execute permissions, you can
safely ignore this. Docker volume mounting sometimes changes the [inode](https://en.wikipedia.org/wiki/Inode)
settings, as identified in the Docker "Manage data in containers" subsection
entitled [Mount a host file as a data volume](https://docs.docker.com/engine/userguide/containers/dockervolumes/).
Specifically, it incorrectly identifies the file as a directory. The warning
emitted by watchfs is a result of checking to make sure the _file_ is
executable, which will fail for anything it thinks is a directory. Hopefully
this will be resolved in future versions of Docker. For now, this can be safely
ignored. 
