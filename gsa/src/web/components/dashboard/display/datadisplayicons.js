/* Greenbone Security Assistant
 *
 * Authors:
 * Björn Ricks <bjoern.ricks@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2018 Greenbone Networks GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
import React from 'react';

import {_} from 'gmp/locale/lang';

import Icon from 'web/components/icon/icon';

import PropTypes from 'web/utils/proptypes';

export const renderDonutChartIcons = ({
  setState, // eslint-disable-line react/prop-types
  ...iconsProps
}) => (
  <React.Fragment>
    <DataDisplayIcons
      {...iconsProps}
    />
    <Icon
      img="st_vendorfix.svg"
      title={_('Toggle 2D/3D view')}
      onClick={() => setState(({show3d}) => ({show3d: !show3d}))}
    />
  </React.Fragment>
);

const DataDisplayIcons = ({
  showCsvDownload = true,
  showSvgDownload = true,
  showFilterSelection = true,
  showToggleLegend = true,
  onDownloadCsvClick,
  onDownloadSvgClick,
  onSelectFilterClick,
  onToggleLegendClick,
}) => (
  <React.Fragment>
    {showFilterSelection &&
      <Icon
        img="filter.svg"
        title={_('Select Filter')}
        onClick={onSelectFilterClick}
      />
    }
    {showSvgDownload &&
      <Icon
        img="download.svg"
        title={_('Download SVG')}
        onClick={onDownloadSvgClick}
      />
    }
    {showCsvDownload &&
      <Icon
        img="download.svg"
        title={_('Download CSV')}
        onClick={onDownloadCsvClick}
      />
    }
    {showToggleLegend &&
      <Icon
        img="list.svg"
        title={_('Toggle Legend')}
        onClick={onToggleLegendClick}
      />
    }
  </React.Fragment>
);

DataDisplayIcons.propTypes = {
  showCsvDownload: PropTypes.bool,
  showFilterSelection: PropTypes.bool,
  showSvgDownload: PropTypes.bool,
  showToggleLegend: PropTypes.bool,
  onDownloadCsvClick: PropTypes.func,
  onDownloadSvgClick: PropTypes.func,
  onSelectFilterClick: PropTypes.func,
  onToggleLegendClick: PropTypes.func,
};

export default DataDisplayIcons;

// vim: set ts=2 sw=2 tw=80: