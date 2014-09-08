class thmcards {

  file { "/home/vagrant/thmcards-start.sh":
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/thmcards-start.sh.erb"),
    mode => "744"
  }

  file { "/home/vagrant/init.sh":
    ensure => present,
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/init.sh.erb"),
    mode => "744"
  }

  exec { "init thm-cards":
    command => "/home/vagrant/init.sh",
    require => File['/home/vagrant/init.sh']
  }

  class { "motd":
    template => "thmcards/motd.erb"
  }

}
