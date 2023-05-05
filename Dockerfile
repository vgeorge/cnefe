FROM osgeo/gdal:ubuntu-small-latest

EXPOSE 2000

ENV HOME=/home/cnefe
WORKDIR $HOME

# Install Spatialite tools
RUN apt-get update -y \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --fix-missing --no-install-recommends \
            spatialite-bin zip

COPY ./ $HOME/

CMD ./parse-faces.sh