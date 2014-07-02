group { 'puppet': ensure => 'present' }

include stdlib

# Ensure the repository is updated before any package is installed
exec { "apt-update":
  command => "/usr/bin/apt-get update"
}

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

# Install nodejs
class prepare {
  class { 'apt': }
  apt::ppa { 'ppa:chris-lea/node.js': }
}
include prepare
 
package {'nodejs': ensure => present, require => Class['prepare'],}
 
package {'grunt-cli':
    ensure   => present,
    provider => 'npm',
    require  => Package['nodejs'],
}

# Install curl
package { "curl":
  ensure => "installed"
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
