/* Copyright (C) 2017-2019 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
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

import _ from 'gmp/locale';

import PropTypes from 'web/utils/proptypes';
import withCapabilities from 'web/utils/withCapabilities';

import Icon from 'web/components/icon/icon';

const ImportIcon = ({
  capabilities,
  size,
  task,
  onClick,
}) => {

  if (!task.isContainer() || !capabilities.mayCreate('report')) {
    return null;
  }

  return (
    <Icon
      value={task}
      size={size}
      img="import.svg"
      onClick={onClick}
      alt={_('Import Report')}
      title={_('Import Report')}
    />
  );
};

ImportIcon.propTypes = {
  capabilities: PropTypes.capabilities.isRequired,
  size: PropTypes.iconSize,
  task: PropTypes.model.isRequired,
  onClick: PropTypes.func,
};

export default withCapabilities(ImportIcon);

// vim: set ts=2 sw=2 tw=80:
