group { 'puppet': ensure => 'present' }

include stdlib

# Ensure the repository is updated before any package is installed
exec { "apt-update":
  command => "/usr/bin/apt-get update"
}

# Install curl
package { "curl":
  ensure => "installed"
}

package {"build-essential":
  ensure => "installed",
  provider => apt
}

exec { "install-node":
  command => "/usr/bin/curl -sL https://deb.nodesource.com/setup | /bin/bash - && /usr/bin/apt-get -y install nodejs"
} -> 
exec { "npm_use_py2":
  command => "npm config set python python2"
} -> 
exec { "install se-interpreter":
  environment => ["HOME=/usr/bin"],
  command => "npm install -g se-interpreter",
  require => Package["build-essential"]
} ->
exec {"install phantomjs":
  environment => ["HOME=/usr/bin"],
  command => "npm install -g phantomjs"
}

#exec { "add-node-repo":
#  command => "/usr/bin/curl -sL https://deb.nodesource.com/setup | /bin/bash -"
#}
## Install nodejs
#package { "nodejs":
#  ensure => "installed"
#}


Exec { path => [ "/bin/", "/sbin/" , "/usr/bin/", "/usr/sbin/" ] }

# Use Mac style installation folder
file { "/usr/local/bin":
  owner => "vagrant",
  group => "vagrant",
  recurse => true
}

# Strangely, bash is not the default...
user { "vagrant":
  ensure => present,
  shell  => "/bin/bash"
}

# Install couchdb
package { "couchdb":
  ensure => "installed"
}

service { "couchdb":
  ensure => "running",
  enable => true,
  require => Package["couchdb"]
}

include thmcards
