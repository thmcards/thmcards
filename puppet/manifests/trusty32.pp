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

#package {"build-essential":
#  ensure => "installed",
#  provider => apt
#}

package{"Xvfb":
  ensure =>"installed"
}->
package{"xfonts-scalable":
  ensure =>"installed"
}->
package{"xfonts-cyrillic":
  ensure =>"installed"
}->
package{"xfonts-100dpi":
  ensure =>"installed"
}->
package{"xfonts-75dpi":
  ensure =>"installed"
}->
package{"culmus":
  ensure =>"installed"
}->
package{"imagemagick":
  ensure =>"installed"
}
package { "firefox": ensure => "latest" }
exec {"install Google Chrome":
  command => "sudo apt-get install libxss1 libappindicator1 libindicator7 && wget https://dl.google.com/linux/direct/google-chrome-stable_current_i386.deb && sudo dpkg -i google-chrome*.deb"
}

package{"maven":
  ensure => "latest"
}

exec { "install-node":
  command => "/usr/bin/curl -sL https://deb.nodesource.com/setup | /bin/bash - && /usr/bin/apt-get -y install nodejs"
}# -> 
#exec { "npm_use_py2":
#  command => "npm config set python python2"
#} -> 
#exec { "install se-interpreter":
#  environment => ["HOME=/usr/bin"],
#  command => "npm install -g se-interpreter",
#  require => Package["build-essential"]
#}

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
