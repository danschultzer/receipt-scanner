cd ~

sudo apt-get install build-essential
sudo apt-get install cmake git libgtk2.0-dev pkg-config libavcodec-dev libavformat-dev libswscale-dev

if [ ! -d "opencv-3.1.0" ]; then
  wget https://github.com/Itseez/opencv/archive/3.1.0.zip -O opencv-3.1.0.zip
  unzip opencv-3.1.0.zip
fi
cd opencv-3.1.0
if [ ! -d "build" ]; then
  mkdir build
fi
cd build
cmake -D CMAKE_BUILD_TYPE=RELEASE -D CMAKE_INSTALL_PREFIX=/usr/local -D WITH_TBB=ON -D WITH_V4L=ON -D WITH_QT=ON -D WITH_OPENGL=ON ..
make -j $(nproc)
sudo make install
sudo ln -s /usr/local/share/OpenCV/3rdparty/lib/libippicv.a /usr/local/lib/
sudo /bin/bash -c 'echo "/usr/local/lib" > /etc/ld.so.conf.d/opencv.conf'
sudo ldconfig
