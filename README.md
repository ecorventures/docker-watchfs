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
  -e "MONITOR1=/watch" \
  -e "MONITOR1_HANDLER=/handler.sh" \
  -e "MONITOR2=/watch2" \
  -e "MONITOR2_HANDLER=/handler.sh" \
  -v "$monitorDirectory:/watch" \
  -v "$handler:/handler.sh" \
  -v "$altMonitorDirectory:/watch2" \
  ecor/watchfs
```

Notice there are 4 environment variables and **3** volumes specified. While this
is verbose, it is necessary to maintain an isolated environment.

Here's what each variable/volume refers to:

### Volumes

- `-v "$monitorDirectory:/watch"`: Map the first monitored directory from my
  local directory to a new directory in the container called `/watch`.
- `"$handler:/handler.sh"`: Map the local handler shell script to a container
  script called `/handler.sh`.
- `-v "$altMonitorDirectory:/watch"`: Map the 2nd monitored directory from my
  local machine to a new directory in the container called `/watch2`.
- `"$handler:/handler.sh"`: Map the local handler shell script to a container
  script called `/handler.sh`. _This is the same handler for both directories!_

### Environment Variables

- `-e "MONITOR1=/watch"`: The first monitored directory. This is the directory
  recognized by the container. This is why the first volume is mapped from the
  local computer to the container directory.
- `-e "MONITOR1_HANDLER=/handler.sh"`: The handler script for the first monitored
  directory (by the path recognized by the _container_).
- `-e "MONITOR2=/watch2"`: The first monitored directory. This is the directory
  recognized by the container. This is why the first volume is mapped from the
  local computer to the container directory.
- `-e "MONITOR2_HANDLER=/handler.sh"`: The handler script for the 2nd monitored
  directory (by the path recognized by the _container_). Since we're only using
  one script to handle changes to both directories, this is the same as the 1st.

## Customization

It is possible to monitor any number of directories. Each monitored directory
needs two environment variables in sequential order. The syntax is:

1. `MONITOR<#><anything>` to identify the directory to be monitored.
1. `MONITOR<#><anything>_HANDLER` to identify the script to execute when
  the monitor detects a change.

Using the example, if you wanted to monitor a third directory, you would add:

```
-e "MONITOR3=/path/to/monitored/directory" \
-e "MONITOR3_HANDLER=/path/to/handler.sh"
```

If you want more meaningful environment variable names, you can customize. For
example, `MONITOR3_MY_BACKUPDIR` and `MONITOR3_MY_BACKUPDIR_HANDLER` are valid. The
only important part of the syntax is the beginning and end. The directory to
monitor should always start with `MONITOR#` while the handler just adds
`_HANDLER` to the end of the variable.

## Running With Privileges

Docker supports running containers with privileges, meaning they basically act
like a part of the host machine. This would allow you to monitor directories on
the host machine without specifying all of the volumes. For example:

```
docker run --rm --name monitor \
  -e "MONITOR1=/local/path/to/monitor" \
  -e "MONITOR1_HANDLER=/local/path/to/handler.sh" \
  --privileged \
  ecor/watchfs
```

The advantage of using privileged is wider and easier access to directories.
Disadvantages include wider and easier access to the host operating system.
Additionally, if volumes are not specified, they cannot be used/attached to
other containers using the `--volumes-from` flag.

# Running as a Service/Daemon

On systemd-capable Linux systems like CoreOS, CentOS 7+, and Ubuntu, it is
easy to setup monitoring using a systemd file.

```sh
[Unit]
Description=Monitor
After=docker.service

[Service]
Restart=always
RestartSec=10
ExecStart=/usr/bin/docker run --rm --name monitor \
  -e "MONITOR1=/watch" \
  -e "MONITOR1_HANDLER=/handler.sh" \
  -e "MONITOR2=/watch2" \
  -e "MONITOR2_HANDLER=/handler.sh" \
  -v "`pwd`/watchme:/watch" \
  -v "`pwd`/handler.sh:/handler.sh" \
  -v "`pwd`/watchme2:/watch2" \
  ecor/watchfs
ExecStop=/usr/bin/docker stop -t 2 monitor

[Install]
WantedBy=local.target
```
