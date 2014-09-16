class thmcards {

  include git

  package{"maven":
    ensure => "latest"
  }

  # Install curl
  package { "curl":
    ensure => "installed"
  }

  class { 'jmeter':
    jmeter_plugins_install    => True
  }

  #package {"build-essential":
  #  ensure => "installed",
  #  provider => apt
  #}

  exec { "install-node":
    command => "/usr/bin/curl -sL https://deb.nodesource.com/setup | /bin/bash - && /usr/bin/apt-get -y install nodejs",
    require => Package["curl"]
  }->
  exec{"install selenium-webdriver":
    environment => ["HOME=/usr/bin"],
    command => "npm install -g selenium-webdriver"
  }
  
  # -> 
  #exec { "npm_use_py2":
  #  command => "npm config set python python2"
  #} -> 
  #exec { "install se-interpreter":
  #  environment => ["HOME=/usr/bin"],
  #  command => "npm install -g se-interpreter",
  #  require => Package["build-essential"]
  #}

  # Install couchdb
  package { "couchdb":
    ensure => "installed"
  }

  service { "couchdb":
    ensure => "running",
    enable => true,
    require => Package["couchdb"]
  }

  #Headless firefox dependencies
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

  package { "firefox": 
    ensure => "latest" 
  }

  package{"libpango1.0-0":
    ensure =>"installed"
  }->
  package{"libxss1":
    ensure =>"installed"
  }->
  package{"libappindicator1":
    ensure =>"installed"
  }->
  package{"xdg-utils":
    ensure =>"installed"
  }->
  exec{"install google chrome":
    command=>"wget https://dl.google.com/linux/direct/google-chrome-stable_current_i386.deb && dpkg -i google-chrome-stable_current_i386.deb"
  }

  exec{"install chrome webdriver":
    command=>"wget http://chromedriver.storage.googleapis.com/2.10/chromedriver_linux32.zip -O /tmp/chromedriver_linux32.zip && unzip -u /tmp/chromedriver_linux32.zip -d /usr/bin && chmod 777 /usr/bin/chromedriver"
  }

  exec{"download selenium standalone":
    command=>"wget http://selenium-release.storage.googleapis.com/2.43/selenium-server-standalone-2.43.0.jar -O /var/lib/selenium-server-standalone-2.43.0.jar && chmod 777 /var/lib/selenium-server-standalone-2.43.0.jar"
  }

  exec{"install python setup tools":
    command=>"wget https://bootstrap.pypa.io/ez_setup.py -O - | python"
  }->
  exec{"install pip":
    command=>"sudo easy_install pip"
  }->
  exec{"install cctrlapp":
    command=>"sudo pip install -U cctrl"
  }

  file { "/home/vagrant/thmcards-start.sh":
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/thmcards-start.sh.erb"),
    mode => "777"
  }

  file { "/home/vagrant/init.sh":
    ensure => present,
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/init.sh.erb"),
    mode => "777"
  }

  exec { "init thm-cards":
    command => "/home/vagrant/init.sh",
    require => File['/home/vagrant/init.sh'],
    environment => ["HOME=/home/vagrant"]
  }

  class { "motd":
    template => "thmcards/motd.erb"
  }

  class { 'sonarqube': }

  class { "jenkins":
      config_hash => {
        "HTTP_PORT" => { "value" => "9090" },
        "AJP_PORT" => { "value" => "9009" }
      },
      plugin_hash => {
        "greenballs" => {},
        "sonar" => {},
        "javadoc" => {},
        "mailer" => {},
        "token-macro" =>{},
        "parameterized-trigger" => {},
        "build-pipeline-plugin" => {},
        "dashboard-view" => {},
        "maven-plugin" => {},
        "jquery"=>{},
        "git-client" => {},
        "scm-api" => {},
        "git" => {},
        "xvfb"=>{},
        "clone-workspace-scm"=>{},
        "performance"=>{},
        "envinject"=>{}
      }
  }



# Jenkins might be installed to different paths depending on OS
  $jenkins_home = $::osfamily ? {
    "Debian" => "/var/lib/jenkins",
    "Ubuntu" => "/var/lib/jenkins",
    default => fail("Unsupported OS family: ${::osfamily}")
  }

  jenkins::job { "thmcards-job":
    name => "THMcards",
    config_file => "/etc/puppet/files/jenkins/thmcards.config.xml"
  }

  jenkins::job { "thmcards-selenium-job":
    name => "THMcards.selenium",
    config_file => "/etc/puppet/files/jenkins/thmcards.selenium.config.xml"
  }

  jenkins::job { "thmcards-jmeter-job":
    name => "THMcards.jmeter",
    config_file => "/etc/puppet/files/jenkins/thmcards.jmeter.config.xml"
  }

  jenkins::job { "thmcards-sonar-job":
    name => "THMcards.sonar",
    config_file => "/etc/puppet/files/jenkins/thmcards.sonar.config.xml"
  }

  jenkins::job { "thmcards-deploy-job":
    name => "THMcards.deploy",
    config_file => "/etc/puppet/files/jenkins/thmcards.deploy.config.xml"
  }

  file { "${jenkins_home}/config.xml":
    require => Class["jenkins::package"],
    source => "/etc/puppet/files/jenkins/jenkins.config.xml",
    notify => Service["jenkins"]
  }

  file { "${jenkins_home}/hudson.plugins.sonar.SonarPublisher.xml":
    require => Class["jenkins::package"],
    source => "/etc/puppet/files/jenkins/hudson.plugins.sonar.SonarPublisher.xml",
    notify => Service["jenkins"]
  }

  file { "${jenkins_home}/org.jenkinsci.plugins.xvfb.XvfbBuildWrapper.xml":
    require => Class["jenkins::package"],
    source => "/etc/puppet/files/jenkins/org.jenkinsci.plugins.xvfb.XvfbBuildWrapper.xml",
    notify => Service["jenkins"]
  }

  file { "${jenkins_home}/hudson.tasks.Maven.xml":
    require => Class["jenkins::package"],
    source => "/etc/puppet/files/jenkins/hudson.tasks.Maven.xml",
    notify => Service["jenkins"]
  }

}
