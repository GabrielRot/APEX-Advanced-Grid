class AgGrid {
  staticId;
  name;
  container;
  ajaxId;
  itemsToSubmit;

  _utils;

  _exportReport;

  _workbook;

  
  _agGroupColumnWrapper;
  _agGroup;

  _agHeaderWrapper;
  _agHeader;

  _agBody;

  _data;

  _columnEventListenerController;

  _isFiltering = false;

  _reportData;

  constructor(staticId, name, ajaxId, itemsToSubmit) {
    this.staticId      = staticId;
    this.name          = name;
    this._ajaxId       = ajaxId;
    this.itemsToSubmit = (itemsToSubmit) && itemsToSubmit.split(',');
    this._utils        = new Utils();

    this._exportReport = new ExportReport();

    this._initialize();
  }

  async _initialize() {
    this._gridUtils.bindDynamicActions.beforeRefresh();

    this.container = this._createContainer();

    this.container.style.width =  '100%';

    this.container.className = 'ag-container';

    try {
      const data = await this._makeJSONRequest();

      try {
        this.buildAG(data);
      } catch (e) {
        this._utils.message.clearMessages();
        this._utils.message.showErrorMessage(`Falha ao construir AG: \n${e.message}`);

        console.error(e);
      }
    } catch (e) {
      console.error('Falha com AJAX callback:', e);
    } finally {
      this._gridUtils.bindDynamicActions.afterRefresh();
      this._gridUtils.bindActions.refresh();
    }
  }

  _createContainer() {
    let agContainer = document.createElement('div');

    agContainer.id = `ag-${apex.util.escapeHTMLAttr(this.staticId)}`;

    document.querySelector(`.t-Region-body > #${this.staticId}`).appendChild(agContainer);

    return agContainer;
  }

    async _makeJSONRequest() {
      let responseData;

      if (this._utils.dev.isDevMode()) console.log('calling request');

      try {
        const loadingContainer = document.createElement('div');

        loadingContainer.className = 'ag-loading-container';

        loadingContainer.style.width = '100%';
        loadingContainer.style.height = '300px';

        this.container.innerHTML = '';

        this.container.appendChild(loadingContainer);

        apex.util.showSpinner(loadingContainer);

        await apex.server.plugin(
          this._ajaxId,
          {
            pageItems: this.itemsToSubmit,
            x01: "getData"
          },
          {
            success: (res) => {
              // if (this._utils.dev.isDevMode()) console.log(JSON.parse(res.data));
              if (this._utils.dev.isDevMode()) console.log(res.data);

              responseData = res.data;
            },
            error: (err) => {
              console.error(err);
              
              this._utils.message.clearMessages();

              if (err.responseText) this._utils.message.showErrorMessage(`Erro ao consultar JSON: \n ${err.responseText}`);
            }
          }
        );
      } finally {
        this.container.innerHTML = '';
      }

      if (this._utils.dev.isDevMode()) console.log('request called');

      return responseData;
  }

  buildAG(pData) {
    if (this._utils.dev.isDevMode()) console.time('buildAG', pData);

    // let data = this._utils.json.parseSafe(pData);
    let data = pData;

    if (data) {
      this._data = data;
      // this._data.options.columns.totalLength = Object.values(this._data.options.columns).length;

      try {
        if(!this._gridUtils.validateOptions()) {
          this.container.appendChild(this._gridUtils.noDataFound.create());

          return;
        }
      } catch (err) {
        console.error(err);

        this.container.appendChild(this._gridUtils.noDataFound.create());

        return;
      }

      this._gridUtils.validatePagination();

      this._reportData = data;

      if (this._data.options?.toolbar?.showToolbar) this.container.appendChild(this.buildAGToolbar(this.staticId, String(this._data?.options?.style?.theme ?? 'ag-slim').toLowerCase()));

      this._agGroupColumnWrapper = this.buildAGGroupColumnWrapper();

      this._agGroup = this.buildAGGroupColumnContainer();

      this._agGroupColumnWrapper.appendChild(this._agGroup)

      this._agHeaderWrapper = this.buildAGHeaderWrapper();

      this._agHeader = this.buildAGHeaderContainer();

      this._agHeaderWrapper.appendChild(this._agHeader);

      this.container.appendChild(this._agGroupColumnWrapper);

      this.container.appendChild(this._agHeaderWrapper);

      this._gridUtils.columnUtils.setColumnsId(); 

      if (data.options?.columnGroup && this._gridUtils.groupColumnUtils.someColumnHasGroup(data)) {
        this._agGroup.appendChild(this.buildAGColumnGroup(
          data,
          this._data.options?.paginations?.columns?.offset,
          this._data.options?.paginations?.columns?.pagination-1
        ));
      }

      this.buildAGColumnHeader(
        this._agHeader, 
        data, 
        this._data.options?.paginations?.columns?.offset, 
        this._data.options?.paginations?.columns?.pagination-1
      );

      this._gridUtils.setResizableColumn(this.staticId);

      this._agBody = this.buildAGBody();

      if (data.options?.rows?.enableZebraStriping) this._agBody.rowsContainer.classList.add('ag-stripe-rows');

      this.container.appendChild(this._agBody.bodyWrapper);
      this.container.appendChild(this._agBody.footerWrapper);

      if (this._data.model.data.length > 0) {
        this.buildAGBodyRow(this._agBody.rowsContainer, this._data, this._data.options.paginations.rows.offset, this._data.options.paginations.rows.pagination-1);
        
        this._gridUtils.columnUtils.addColumnEventListeners(this.staticId, this._data);

        if (this._data.options.paginations.rows.type.toLowerCase() == 'page') {
          this._agBody.bodyFooterContainer.append(this._gridUtils.footerUtils.buildPaginationFooter(this._data));
        }

        this._gridUtils.footerUtils.addEventsListenersToPaginationButtons(this.staticId, this._data);
      } else {
        this._agBody.rowsContainer.appendChild(this._gridUtils.noDataFound.create());
      }

      this._gridUtils.addScrollGrid(this.staticId);

      this._gridUtils.setAutoResize(this.staticId);

      this._gridUtils.columnUtils.headerUtils.applyStickyTop(this.staticId);

      this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(this.staticId);

      apex.region(this.staticId).element.on('apexaftershow', this._gridUtils.bindActions.afterShow);
      
      // this._gridUtils.columnUtils.headerUtils.setStickyHeader(this.staticId);

      // this._gridUtils.columnUtils.headerUtils.setColumnPopupOptions(this.staticId);

      window.dispatchEvent(new Event('resize'));

    } else {
      this.container.appendChild(this._gridUtils.noDataFound.create());
    }

    if (this._utils.dev.isDevMode()) console.timeEnd('buildAG');
  }

  buildAGToolbar(staticId, style = 'ag-slim') {
    const toolbarContainer = document.createElement('div');

    toolbarContainer.className = `ag-toolbar-container ${style}`;

    const toolbarContainerLeft  = document.createElement('div');

    toolbarContainerLeft.className = 'ag-toolbar-container-left';

    if (this._data.options.toolbar.searchField.showSearchField) {
      const toolbarSearchFieldContainer = document.createElement('div');

      toolbarSearchFieldContainer.className = 'ag-toolbar-search-field-container';

      toolbarSearchFieldContainer.appendChild(this._gridUtils.toolbarUtils.createSearchField(staticId));

      toolbarContainerLeft.appendChild(toolbarSearchFieldContainer);
    }

    if (this._data.options.toolbar.actions.showActionsButton) {
      const toolbarActionsButtonContainer = document.createElement('div');

      toolbarActionsButtonContainer.className ='ag-toolbar-actions-button-container';

      toolbarActionsButtonContainer.appendChild(this._gridUtils.toolbarUtils.createActionsButton(staticId));

      toolbarContainerLeft.appendChild(toolbarActionsButtonContainer);
    }

    toolbarContainer.appendChild(toolbarContainerLeft);

    return toolbarContainer;
  }

  buildAGHeaderWrapper() {
    let headerWrapper = document.createElement('div');

    headerWrapper.className = 'ag-header-wrapper';

    return headerWrapper;
  }

  buildAGGroupColumnWrapper() {
    const columnGroupWrapper = document.createElement('div');

    columnGroupWrapper.className = 'ag-group-wrapper'

    return columnGroupWrapper;
  }

  buildAGGroupColumnContainer() {
    const columnGroupContainer = document.createElement('div');

    columnGroupContainer.className = 'ag-col-group-container u-flex'

    return columnGroupContainer;
  }

  buildAGHeaderContainer() {
    let headerContainer = document.createElement('div');

    headerContainer.className = 'ag-col-header-container u-flex';

    return headerContainer;
  }

  buildAGColumnGroup(data, offset, pagination) {
    const fragment = document.createDocumentFragment();

    const columnsKeys = Object.keys(data.options.columns);

    let previousColumnGroupWasBlank = false;
    let previousColumnGroupWasFrozen = false;
    // let previousColumnGroupId = ''; 
    let createNewGroup = true;

    let i;

    let columnsChildren = [];

    let validateIndexFrozen = -1;

    for (i = 0; i < columnsKeys.length; i++) {
      const columnKey = columnsKeys[i]
      const column = data.options?.columns[columnKey];

      if (column.frozen) validateIndexFrozen = i;
    }

    // for (i = 0; i < columnsKeys.length; i++) {
    for (i = offset; i <= (offset + pagination); i++) {
      const columnKey = columnsKeys[i]
      const column = data.options?.columns[columnKey];

      if (!column) continue;
      
      const columnGroup = (data.options?.columnGroup) ? data.options?.columnGroup[column.group] ?? {} : {};

      const previousColumnKey = columnsKeys[i-1];
      const previousColumn = data.options?.columns[previousColumnKey];
      const previousColumnGroupId = previousColumn?.group || '';

      previousColumnGroupWasBlank = (previousColumnGroupId == '' && i != 0); 

      if ((!columnGroup.header && !previousColumnGroupWasBlank)) {
        // previousColumnGroupId = '';
        columnsChildren = [];

        fragment.appendChild(
          this._gridUtils.groupColumnUtils.buildGroupColumn(
            String(data.options?.style.theme ?? 'ag-slim').toLowerCase(),
            false,
            '',
            null
          )
        );

        previousColumnGroupWasBlank = true;
        previousColumnGroupWasFrozen = false;
        
        continue;
      } else if (!columnGroup.header) {
        previousColumnGroupWasBlank = true;
        previousColumnGroupWasFrozen = true;
        
        continue;
      }

      if ((column.group == previousColumnGroupId) && !createNewGroup) {
        const columnGroup = fragment.querySelector(`[data-childrens="${columnsChildren.join(',')}"]`);

        columnsChildren.push(columnKey);

        columnGroup.setAttribute('data-childrens', columnsChildren.join(','));

        if (i == validateIndexFrozen) {
          const columnGroups = fragment.querySelectorAll('.ag-col-group-header');
          
          if (columnGroups.length > 0) {
            columnGroups.forEach((columnGroup) => {
              columnGroup.classList.add('ag-frozen-group');
            });

            columnGroups[columnGroups.length-1].classList.add('ag-frozen-group-last');
          }

          // previousColumnGroupId = '';
          createNewGroup = true;
          columnsChildren = [];
        }

        continue;
      }

      fragment.appendChild(this._gridUtils.groupColumnUtils.buildGroupColumn(
        String(data.options?.style.theme ?? 'ag-slim').toLowerCase(),
        column.frozen,
        this._utils.escapeHtml(columnGroup.header),
        column.group,
        columnKey
      ));

      columnsChildren.push(columnKey);

      previousColumnGroupWasFrozen = !!column.frozen;
      previousColumnGroupWasBlank = false;
      // previousColumnGroupId = column.group;
      createNewGroup = false;
    }

    return fragment;
  }

  buildAGColumnHeader(headerContainer, data, offset, pagination) {
    let columnsOption = Object.values(data.options?.columns);
    let columnsKeys   = Object.keys(data.options?.columns);

    let fragment = document.createDocumentFragment();

    let columnOption;

    let i;

    const theme = String(data.options?.style?.theme ?? 'ag-slim').toLowerCase();

    const columnHeaderHeight = (theme == 'ag-fat') ? 40 : 32;

    for(i = offset; i <= (offset + pagination); i++) {
      columnOption = columnsOption[i];

      if (columnOption) {    
        // if (!columnOption.staticId) columnOption.staticId = this._utils.random.getRandomId();
        let columnHeader = document.createElement('div');

        columnHeader.className = `ag-col-header ag-col-resizable ag-u-flex ${theme}`;

        if (columnOption.styles) {
          const borderTopWidth = 10;

          const color = this._utils.color.getTemplateColor(columnOption.styles.borderTopColor).color;

          columnHeader.style.borderTopColor = color;
          columnHeader.style.borderTopWidth = `${borderTopWidth}px`;
          columnHeader.style.borderTopStyle = 'solid';

          columnHeader.style.minHeight = `${columnHeaderHeight + borderTopWidth}px`;
          columnHeader.style.maxHeight = `${columnHeaderHeight + borderTopWidth}px`;
        }

        if (columnOption.frozen) columnHeader.classList.add('ag-frozen-column');

        columnHeader.id = `${columnOption.staticId}`;

        columnHeader.setAttribute('data-column', `${columnsKeys[i]}`);

        if (columnOption.width){
            columnHeader.style.width = `${columnOption.width}px`;
            columnHeader.style.minWidth = `${columnOption.width}px`;
            columnHeader.style.flex = `0 0 ${columnOption.width}px`;
        } 

        let tradeColumnSequence = document.createElement('div');

        let columnHeaderValue = document.createElement('div');

        columnHeaderValue.className = 'ag-col-header-content';

        columnHeaderValue.style.textAlign = columnOption.alignment.toLowerCase() || 'start';

        columnHeaderValue.setAttribute('title', this._utils.escapeHtml(columnOption.header));

        columnHeaderValue.innerHTML = this._utils.escapeHtml(columnOption.header);

        columnHeader.appendChild(tradeColumnSequence);

        columnHeader.appendChild(columnHeaderValue);

        columnHeader.appendChild(this._gridUtils.columnUtils.headerUtils.buildColumnOrderBy());

        fragment.appendChild(columnHeader);
      }

      this._data.options.paginations.columns.offset = offset + pagination;
    };

    headerContainer.appendChild(fragment);
  }

  buildAGBody() {
    let bodyWrapper = document.createElement('div');

    bodyWrapper.className = 'ag-body-wrapper';
    
    let bodyContainer = document.createElement('div');

    bodyContainer.className = 'ag-body-container';
    
    let rowsContainer = document.createElement('div');

    rowsContainer.className = 'ag-rows-container';

    let footerWrapper = document.createElement('div');

    footerWrapper.className = 'ag-footer-wrapper';

    let footerScroll  = document.createElement('div');

    footerScroll.className = 'ag-footer-scroll';

    let bodyFooterContainer = document.createElement('div');

    bodyFooterContainer.className = 'ag-body-footer-container';

    bodyContainer.appendChild(rowsContainer);

    bodyWrapper.appendChild(bodyContainer);

    footerWrapper.appendChild(footerScroll);

    footerWrapper.appendChild(bodyFooterContainer);

    return {
      "bodyWrapper": bodyWrapper,
      "bodyContainer": bodyContainer,
      "rowsContainer": rowsContainer,
      "footerWrapper": footerWrapper,
      "footerScroll": footerScroll,
      "bodyFooterContainer": bodyFooterContainer
    }
  }

  buildAGBodyRow(container, data, offset, pagination, columnsOffset = 0, pColumnsPagination = null) {
    let rowContainer
    let pkRowData;
    let columnsOptions = data.options?.columns || {};
    let columns;
    let columnsPagination = (pColumnsPagination != null) ? pColumnsPagination : this._data.options.paginations.columns.pagination-1;

    let renderedColumns = document.querySelectorAll(`#${ this.staticId } .ag-col-header`);

    if (renderedColumns.length > 0) columnsPagination = renderedColumns.length -1;

    let i;
    let rowData;

    let j;

    let displayedRowsQty = 0;

    let fragment   = document.createDocumentFragment();

    let rowIndexes = {};

    data?.model?.data?.forEach((value, i) => {
      rowIndexes[i] = { "rowIndex": this._data?.model?.data?.indexOf(value) }
    });

    for(i = offset; i <= (offset + pagination); i++) {
      rowData = data.model?.data[i];

      if (rowData) {
        rowContainer = document.createElement('div');
        rowContainer.className = 'ag-row-container ag-u-flex';
        rowContainer.setAttribute('data-rownum', rowIndexes[i].rowIndex+1);
        
        pkRowData    = [];

        if (!columns) {
          columns = Object.keys(rowData);
        }

        for (j = columnsOffset; j <= columnsPagination; j++) {
          let rowColumnData = rowData[columns[j]];

          if (rowColumnData) rowContainer.appendChild(this._gridUtils.columnUtils.buildRowColumn(rowColumnData, columnsOptions, columns[j], data.options?.style?.theme));
        }

        fragment.appendChild(rowContainer);

        displayedRowsQty = i+1;
      } else {
        i = offset + pagination;
      }

    }

    this._data.options.paginations.rows.offset = i;

    if (data.options.paginations.rows.type.toLowerCase() == 'page') this._gridUtils.footerUtils.setPaginationLabel(this.staticId, data, offset, displayedRowsQty);

    container.appendChild(fragment);

    window.dispatchEvent(new Event('resize'));
  }

  _columnContainer;
  _cellContainer;
  _IconCell;
  _labelCell;

  _badgeColumnContainer;
  _badgeColumnColor = '#FFFFFF';
  _badgeColumn = $('<div class="ag-badge-column"></div>');

  _columnHeaderOrderBy;
  _columnHeaderOrderByContainer;
  
  _orderByAscButton;
  _orderByDescButton;

  _autoResizeTimer;

  _columnOption = {};
  _columnDOMConfig = {};
  _rowColumnContainer;
  _customColumnData;

  _badgeColor;
  _fontColor;

  _setHeaderContainerPositionAndPagination;
  _scrollLinesPagination;


  _gridUtils = {
    validateOptions: () => {
      if (!this._data.options) this._data.options = {};

      if (!this._data.model || !this._data.model?.data || this._data.model?.data?.length == 0) return false;

      let rowData = this._data.model.data[0];
      let keys    = Object.keys(rowData);

      if (!this._data.options.columns) this._data.options.columns = {};

      let oldColumns = this._data.options.columns;
      let newColumns = {}

      keys.forEach((key) => {
        let column = oldColumns[key] || {};

        newColumns[key] = {
          header:        column.header        ?? key,
          alignment:     column.alignment     ?? (typeof rowData[key].value == 'number' ? 'right' : 'left'),
          type:          column.type          ?? (typeof rowData[key].value == 'number' ? 'NUMBER' : 'VARCHAR2'),
          width:         column.width         ?? key,
          frozen:        column.frozen        ?? false,
          readOnlyStyle: column.readOnlyStyle ?? false,
          group:         column.group         ?? null,
          styles:        column.styles        ?? null
        };
      });

      this._data.options.columns = newColumns;

      if (!this._data.options.toolbar) this._data.options.toolbar = {};

      if (!this._data.options.toolbar.searchField) this._data.options.toolbar.searchField = {}

      this._data.options.toolbar.searchField.showSearchField = this._data.options.toolbar.searchField.showSearchField ?? true;

      this._data.options.toolbar.searchField.ignoreCaseSensitive = this._data.options.toolbar.searchField.ignoreCaseSensitive ?? true;

      this._data.options.toolbar.searchField.searchFor = this._data.options.toolbar.searchField.searchFor ?? 'all';

      if (!this._data.options.toolbar.actions) this._data.options.toolbar.actions = {};

      this._data.options.toolbar.actions.showActionsButton = this._gridUtils.toolbarUtils.validateActionsButton(this._data);

      this._data.options.toolbar.showToolbar = this._gridUtils.toolbarUtils.validateShowToolbar(this._data);

      return true;
    },
    noDataFound: {
      create: () => {
        let noDataFoundContainer = document.createElement('div');

        noDataFoundContainer.className = 'ag-nodata-found-container';

        let noDataFoundIconContainer = document.createElement('div');

        noDataFoundIconContainer.innerHTML = `
          <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.7955 15.8111L21 21M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="#CECECE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

        noDataFoundIconContainer.className = 'ag-nodatafound-icon-container';

        noDataFoundContainer.appendChild(noDataFoundIconContainer);

        let noDataFoundLabelContainer = document.createElement('div');

        noDataFoundLabelContainer.className = 'ag-nodatafound-label-container';

        let noDataFoundLabel = document.createElement('span');

        noDataFoundLabel.innerText = 'Nenhum dado encontrado';

        noDataFoundLabelContainer.appendChild(noDataFoundLabel);

        noDataFoundContainer.appendChild(noDataFoundLabelContainer);

        return noDataFoundContainer;
      }
    },
    setAutoResize: (staticId) => {
      let columnsWithoutResize;

      const autoResize = () => { 
        clearTimeout(this._autoResizeTimer);

        this._autoResizeTimer = setTimeout(() => {
          let columnHeaders = document.querySelectorAll(`#ag-${staticId} .ag-col-header`);
          
          for(const columnHeader of columnHeaders) {
            const dataColumn = columnHeader.getAttribute('data-column');

            const column = this._data.options?.columns[dataColumn];

            document.querySelectorAll(`#ag-${staticId} .ag-cell-container[data-column="${dataColumn}"]`).forEach((rowColumn) => {
              rowColumn.style.width = `${columnHeader.getBoundingClientRect().width}px`;

              columnsWithoutResize = [...document.querySelectorAll(`#${staticId} .ag-cell-container`)].filter((column) => column.style.flex != '0 0 auto');
            
              columnsWithoutResize.forEach((columnWithoutResize) => {
                columnWithoutResize.style.flex = '0 0 auto';
              });
            });

            this._gridUtils.groupColumnUtils.resizeGroupColumns(staticId);
            this._gridUtils.footerUtils.resizePlaceholderVirtualScroll(this.staticId);
          }

          if (this._data.options?.columnGroup && this._gridUtils.groupColumnUtils.someColumnHasGroup(this._data)) {
            this._gridUtils.groupColumnUtils.frozenGroup.applyStickyLeft(staticId);
          }
        }, 100);       
      };

      // window.removeEventListener('resize', autoResize);
      window.addEventListener('resize', autoResize);
    },
    bindDynamicActions: {
      beforeRefresh: () => {
        apex.jQuery(`#${this.staticId}`).trigger('apexbeforerefresh');
      },
      afterRefresh: () => {
        apex.jQuery(`#${this.staticId}`).trigger('apexafterrefresh');
      },
    },
    bindActions: {
      refresh: async () => {
        let data;
        
        const requestJSONData = async () => {
          this._gridUtils.bindDynamicActions.beforeRefresh();

          data = await this._makeJSONRequest();

          try {
            this.container.innerHTML = '';
            
            this.buildAG(data);
          } catch (e) {
            this._utils.message.clearMessages();
            this._utils.message.showErrorMessage(`Falha ao construir AG: \n${e.message}`);

            console.error(e);
          }

          this._gridUtils.bindDynamicActions.afterRefresh();
        }

        $(`#${this.staticId}`).off('apexrefresh', requestJSONData);

        $(`#${this.staticId}`).on('apexrefresh', requestJSONData);

      },
      afterShow: () => {
        window.dispatchEvent(new Event('resize'));
      }
    },
    addScrollGrid: (staticId) => {
      const groupWrapper    = document.querySelector(`#${staticId} .ag-group-wrapper`);
      const headerWrapper   = document.querySelector(`#${staticId} .ag-header-wrapper`);
      const columnContainer = document.querySelector(`#${staticId} .ag-col-header-container`);
      const bodyWrapper     = document.querySelector(`#${staticId} .ag-body-wrapper`);
      const scroller        = document.querySelector(`#${staticId} .ag-footer-wrapper`);

      this._gridUtils.footerUtils.resizePlaceholderVirtualScroll(staticId);
      
      let data            = this._data;
      
      let columnOptions   = data.options?.columns;
      let paginations     = data.options?.paginations;
      let columnsLength   = Object.values(columnOptions).length;
      let renderedColumns;

      let buildAGColumnGroup  = this.buildAGColumnGroup.bind(this);
      let groupContainer      = this._agGroup;
      let buildAGColumnHeader = this.buildAGColumnHeader.bind(this);
      let headerContainer     = this._agHeader;

      let offset;
      let pagination;

      let rowData;
      let rowColumnKeys;

      let rowsLength = data.model?.data.length;

      let offsetRows;
      let paginationRows;

      let renderedRows;

      this._setHeaderContainerPositionAndPagination = () => {
        // columnContainer.style.transform = `translateX(-${scroller.scrollLeft}px)`;

          groupWrapper.scrollLeft  = scroller.scrollLeft;
          headerWrapper.scrollLeft = scroller.scrollLeft;
          bodyWrapper.scrollLeft   = scroller.scrollLeft;
        
        if ((scroller.scrollLeft + scroller.clientWidth)+2 >= scroller.scrollWidth) {
          renderedColumns = document.querySelectorAll(`#${staticId} .ag-col-header`);

          if (renderedColumns.length < columnsLength) {
            offset     = paginations.columns?.offset;
            pagination = paginations.columns?.pagination;

            offset++;

            if (pagination > columnsLength) {
              pagination = (pagination - columnsLength);
            }

            if (offset == columnsLength) {
              offset = columnsLength-1;
            }
            
            groupContainer.appendChild(buildAGColumnGroup(data, offset, pagination));

            buildAGColumnHeader(headerContainer, data, offset, pagination);

            document.querySelectorAll(`#${staticId} .ag-row-container`).forEach((rowContainer, i) => {
              rowData       = data.model.data[i];
              rowColumnKeys = Object.keys(rowData);

              for (let j = offset; j <= (pagination + offset); j++) {
                if (rowColumnKeys[j]) {
                  rowContainer.appendChild(this._gridUtils.columnUtils.buildRowColumn(rowData[rowColumnKeys[j]], data.options.columns, rowColumnKeys[j], data.options?.style?.theme));
                } else {
                  j = (pagination + offset);
                }
              }
            });

            this._gridUtils.footerUtils.resizePlaceholderVirtualScroll(staticId);

            this._gridUtils.setResizableColumn(staticId);
            this._gridUtils.groupColumnUtils.resizeGroupColumns(staticId);
          }
        }

        this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(this.staticId);
      }

      document.removeEventListener('scroll', this._scrollLinesPagination);


      this._scrollLinesPagination = () => {
        if (!this._isFiltering)

        if ((document.documentElement.scrollTop + document.documentElement.clientHeight)+10 >= document.documentElement.scrollHeight) {
          renderedRows    = document.querySelectorAll(`#${staticId} .ag-row-container`);
          renderedColumns = document.querySelectorAll(`#${staticId } .ag-col-header`);

          if (renderedRows.length < rowsLength) {
            offsetRows     = this._data.options.paginations.rows.offset;
            paginationRows = this._data.options.paginations.rows.pagination;

            offsetRows++;

            if (paginationRows > rowsLength) {
              paginationRows = (paginationRows - rowsLength);
            }

            if (offsetRows == rowsLength) {
              offsetRows = rowsLength-1;
            }

            this.buildAGBodyRow(this._agBody.rowsContainer, data, offsetRows-1, paginationRows, 0, renderedColumns.length -1);
          }
        }

        this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(this.staticId);
      }

      scroller.removeEventListener('scroll', this._setHeaderContainerPositionAndPagination);
      scroller.addEventListener('scroll', this._setHeaderContainerPositionAndPagination);
      
      if (String(this._data.options.paginations.rows.type).toLowerCase() == 'scroll' || !this._data.options.paginations.rows) {
        document.addEventListener('scroll', this._scrollLinesPagination);
      }
    },
    validatePagination: () => {
      let columnsLength = Object.values(this._data.options?.columns).length;

      this._data.options.paginations         = this._data.options.paginations || {};

      this._data.options.paginations.columns = this._data.options.paginations.columns || {};

      this._data.options.paginations.columns.offset     = this._data.options.paginations.columns.offset || 0;
      this._data.options.paginations.columns.pagination = this._data.options.paginations.columns.pagination || (columnsLength > 50) ? 50 : columnsLength;

      this._data.options.paginations.rows = this._data.options.paginations.rows || {}

      this._data.options.paginations.rows.type       = String(this._data.options.paginations.rows.type || 'scroll').toLowerCase();
      
      this._data.options.paginations.rows.offset     = this._data.options.paginations.rows.offset                     || 0;
      this._data.options.paginations.rows.pagination = this._data.options.paginations.rows.pagination                 || 50;

      this._data.options.paginations.rows.initialOffset     = 0;
      this._data.options.paginations.rows.initialPagination = this._data.options.paginations.rows.pagination;

      if (this._data.options.paginations.rows.type == 'scroll') this._data.options.paginations.rows.pagination = 50;

      if (!['scroll', 'page'].includes(this._data.options.paginations.rows.type.toLowerCase())) throw new Error('Tipo de paginação por linhas incorreto');

      if (this._data.options.paginations.rows.type.toLowerCase() == 'page' && this._data.options.paginations.rows.pagination < 5) throw new Error('A paginação por linhas deve ter no mínimo 5 linhas');
    },

    toolbarUtils: {
      validateShowToolbar: (data) => {
        if (!data.options.toolbar.showToolbar) return false;

        if (
          !data.options.toolbar.searchField.showSearchField && 
          !data.options.toolbar.actions.showActionsButton
        ) return false;

        return true;
      },
      validateActionsButton: (data) => {
        data.options.toolbar.actions.showActionsButton  = data.options.toolbar.actions.showActionsButton  ?? true
        data.options.toolbar.actions.showDownloadReport = data.options.toolbar.actions.showDownloadReport ?? true;

        if (!data.options.toolbar.actions.showActionsButton) return false;

        if (!data.options.toolbar.actions.showDownloadReport) return false;

        return true;
      },
      addSearchInputEventListener: (element, staticId) => {
        element.addEventListener('keyup', (event) => {
          if (event.key !== 'Enter') return;

          this._isFiltering = true;

          const searchedValue = event.target.value;

          this._agBody.rowsContainer.innerHTML = '';

          if (String(this._data?.options?.paginations?.rows?.type).toUpperCase() == 'PAGE') {
            this._agBody.bodyFooterContainer.innerHTML = '';
          }
          
          if (searchedValue  != '') {
            let searchedData;

            const ignoreCaseSensitive = this._data.options.toolbar.searchField.ignoreCaseSensitive;

            if (String(this._data.options.toolbar.searchField.searchFor).toUpperCase() == 'ALL') {
              searchedData = this._data?.model?.data.filter(row => {       
                                return Object.values(row).some((column) => {
                                  return (ignoreCaseSensitive) 
                                    ? String(column.value).toLowerCase().includes(searchedValue) 
                                    : String(column.value).includes(searchedValue)
                                })
                              })
            } else {
              let searchKey = this._data.options.toolbar.searchField.searchFor;

              searchedData = this._data?.model?.data.filter(row => {
                return (ignoreCaseSensitive) 
                  ? String(row[searchKey].value).toLowerCase().includes(searchedValue)
                  : String(row[searchKey].value).includes(searchedValue)
              })
            }

            const filteredValue = {
              "options": this._data?.options,
              "model": {
                "data": searchedData
              }
            }

            if (filteredValue.model?.data?.length > 0) {
              if (String(this._data?.options?.paginations?.rows?.type).toUpperCase() == 'PAGE') {
                this.buildAGBodyRow(this._agBody.rowsContainer, filteredValue, 0, this._data?.options?.paginations?.rows?.pagination-1);
                
                this._agBody.bodyFooterContainer.appendChild(this._gridUtils.footerUtils.buildPaginationFooter(filteredValue));
                this._gridUtils.footerUtils.addEventsListenersToPaginationButtons(staticId, filteredValue);
              } else {
                this.buildAGBodyRow(this._agBody.rowsContainer, filteredValue, filteredValue.options?.paginations?.rows?.initialOffset, filteredValue.model?.data?.length-1)
              }

              this._reportData = filteredValue;
            } else {
              this._agBody.rowsContainer.appendChild(this._gridUtils.noDataFound.create());
            }
          } else {
            this.buildAGBodyRow(this._agBody.rowsContainer, this._data, this._data.options?.paginations?.rows?.initialOffset, this._data.options?.paginations?.rows?.pagination-1);
          
            if (String(this._data?.options?.paginations?.rows?.type).toUpperCase() == 'PAGE') {
              this._agBody.bodyFooterContainer.appendChild(this._gridUtils.footerUtils.buildPaginationFooter(this._data));
              this._gridUtils.footerUtils.addEventsListenersToPaginationButtons(staticId, this._data);
            }

            this._isFiltering = false;

            this._reportData = this._data;
          }
        });
      },
      createSearchField: (staticId) => {
        const callSarchDropdownButtonPopup = (event) => {
          const popupConfig = [];

          const selectedIcon = 'fa-dot-circle-o';

          popupConfig.push({
            icon: (!this._data.options.toolbar.searchField.ignoreCaseSensitive) && "fa-check-circle-o",
            label: "Distinção entre maiúsculas e minúsculas",
            callback: () => this._data.options.toolbar.searchField.ignoreCaseSensitive = !this._data.options.toolbar.searchField.ignoreCaseSensitive
          });

          popupConfig.push({
            type: "divider"
          });

          const popupItemAllColumnsLabel = "Todas ás colunas de texto"; 

          popupConfig.push({
            icon: (String(this._data.options.toolbar.searchField.searchFor).toUpperCase() == 'ALL') && selectedIcon,
            label: popupItemAllColumnsLabel,
            callback: () => {
              const searchInput = document.querySelector(`#ag-toolbar-input-${staticId}`);

              if (searchInput) searchInput.setAttribute('placeholder', `Pesquisar: ${popupItemAllColumnsLabel}`);

              this._data.options.toolbar.searchField.searchFor = 'all';
            }
          });

          const columnsKeys = Object.keys(this._data.options.columns);

          if (columnsKeys.length > 0) {
            
            
            columnsKeys.forEach((columnKey) => {
              const columnData = this._data.options.columns[columnKey];

              popupConfig.push({
                icon: (String(this._data.options.toolbar.searchField.searchFor).toUpperCase() == String(columnKey).toUpperCase()) && selectedIcon,
                label: columnData.header,
                callback: () => {
                  const searchInput = document.querySelector(`#ag-toolbar-input-${staticId}`);

                  if (searchInput) searchInput.setAttribute('placeholder', `Pesquisar: ${this._utils.escapeHtml(columnData.header)}`);

                  this._data.options.toolbar.searchField.searchFor = columnKey;
                }
              });
            });
          };

          this._utils.popup.calloutPopup(staticId, event.target.closest('.ag-toolbar-search-input-icon-container'), popupConfig);
        }

        let toolbarSearchFieldInputContainer = document.createElement('div');

        toolbarSearchFieldInputContainer.className = 'ag-toolbar-search-field-input-container';
    
        const dropdownSearchButton = this._gridUtils.toolbarUtils.createDropdownSearchButton();

        dropdownSearchButton.addEventListener('click', callSarchDropdownButtonPopup);

        toolbarSearchFieldInputContainer.appendChild(dropdownSearchButton);

        let toolbarSearchInputContainer = document.createElement('div');

        toolbarSearchInputContainer.className = 'ag-toolbar-search-input-container';

        let toolbarSearchInput = document.createElement('input');

        toolbarSearchInput.setAttribute('id', `ag-toolbar-input-${staticId}`);
        
        toolbarSearchInput.setAttribute('type', 'text');

        const searchFor = this._data.options.toolbar.searchField.searchFor;

        toolbarSearchInput.setAttribute('placeholder', `Pesquisar: ${
          (String(searchFor).toUpperCase() == 'ALL')
            ? 'Todas ás colunas de texto'
            : this.data.columns[searchFor]?.header
        }`);

        toolbarSearchInputContainer.appendChild(toolbarSearchInput);

        this._gridUtils.toolbarUtils.addSearchInputEventListener(toolbarSearchInput, staticId);

        toolbarSearchFieldInputContainer.appendChild(toolbarSearchInputContainer);

        return toolbarSearchFieldInputContainer;
      },
      createDropdownSearchButton: () => {
        const toolbarSearchInputIconContainer = document.createElement('div');

        toolbarSearchInputIconContainer.className = 'ag-toolbar-search-input-icon-container';

        const toolbarSearchIcon = document.createElement('span');

        toolbarSearchIcon.className = 'fa fa-search';

        toolbarSearchIcon.style.fontSize = 'inherit';

        toolbarSearchInputIconContainer.appendChild(toolbarSearchIcon);

        const toolbarSearchDropdownIcon = document.createElement('div');

        toolbarSearchDropdownIcon.className = 'fa fa-chevron-down';

        toolbarSearchDropdownIcon.style.fontSize = '10px';

        toolbarSearchInputIconContainer.appendChild(toolbarSearchDropdownIcon);

        return toolbarSearchInputIconContainer;
      },
      addActionsButtonEventListener: (staticId, pElement) => {
        const createExportationType = (icon, label, type, selected = false) => {
          const exportationType = document.createElement('div');

          exportationType.className = 'ag-report-export-type';

          exportationType.setAttribute('data-type', type);
          exportationType.setAttribute('role', 'option');
          exportationType.setAttribute('aria-selected', String(selected));
          exportationType.setAttribute('title', this._utils.escapeHtml(label));

          const exportationOptionTypeIcon = document.createElement('div');

          exportationOptionTypeIcon.className = 'ag-report-export-type-icon';

          exportationOptionTypeIcon.innerHTML = `<span style="font-size: 32px;" class="fa ${icon}"></span>`;

          const exportationOptionTypeLabel = document.createElement('div');

          exportationOptionTypeLabel.className = 'ag-repost-export-type-label';

          exportationOptionTypeLabel.innerHTML = `<span>${this._utils.escapeHtml(label)}</span>`

          exportationType.appendChild(exportationOptionTypeIcon);
          exportationType.appendChild(exportationOptionTypeLabel);

          return exportationType;
        }

        const element = this._utils.elements.getElement(pElement);

        const modalContent = document.createElement('div');

        modalContent.className = 'ag-modal-content';

        const modalTopRegionContainer = document.createElement('div');

        modalTopRegionContainer.className = 'ag-modal-top-region-container';

        const modalChooseFormatTitle = document.createElement('div');

        modalChooseFormatTitle.className = 'ag-top-region-title'

        modalChooseFormatTitle.innerHTML = '<span>Escolher Formato</span>';

        modalTopRegionContainer.appendChild(modalChooseFormatTitle);

        const modalExportTypesContainer = document.createElement('div');

        modalExportTypesContainer.appendChild(createExportationType('fa-file-excel-o', 'Excel', 'xlsx', true));

        modalTopRegionContainer.appendChild(modalExportTypesContainer);

        modalContent.appendChild(modalTopRegionContainer);

        const modalId = this._utils.random.getRandomId();

        const exportationFunctions = {
          "xlsx": () => {

            let xlsxData = { groups: [], worksheetName: 'Planilha1', columns: [], rows: [], custom: [] };

            // const groupKeys  = Object.keys(this._reportData?.options?.columns);
            const columnKeys = Object.keys(this._reportData?.options?.columns);

            let columnGroupWidth       = 0;
            const isColumnGroupEnabled = (this._reportData.options?.columnGroup && this._gridUtils.groupColumnUtils.someColumnHasGroup(this._reportData));
            let columnGroupArrayIndex  = 0;

            // groupKeys.forEach((groupKey) => {
            //   const columnData = this._reportData.options.columns[]
            // });

            let customValue;
            let columnWidth = 0;
            let lastFrozenColumnIndex = -1;

            columnKeys.forEach((key, i) => {
              const columnData = this._reportData.options.columns[key];

              if (columnData.frozen) lastFrozenColumnIndex = i;
            });

            if (lastFrozenColumnIndex >= 0) xlsxData.frozen = lastFrozenColumnIndex+1;

            columnKeys.forEach((key, i) => {
              const columnData = this._reportData.options.columns[key];

              columnWidth = String(columnData.header).length * 2;
              
              xlsxData.columns.push(
                {
                  "key": key,
                  "header": columnData.header,
                  "width": (columnWidth >= 30) ? columnWidth : 30,
                }
              );

              if (isColumnGroupEnabled) xlsxData.columns[i].alignment = columnData.alignment;

              customValue = {};

              customValue.alignment = {};

              customValue.alignment.vertical = 'middle';
              customValue.alignment.horizontal = this._reportData.options.columns[key].alignment;
              customValue.alignment.wrapText = true;

              xlsxData.custom.push(customValue);

              if (isColumnGroupEnabled) {
                const columnGroup            = this._reportData.options?.columnGroup[columnData.group] || {};
                const columnGroupHeader      = (columnGroup.header) ? columnGroup.header : '';
                const isColumnGroupFrozen    = (lastFrozenColumnIndex >= i);
                const breakFrozenColumnGroup = (i == lastFrozenColumnIndex+1);

                const inheritedColumnGroup       = xlsxData.groups[columnGroupArrayIndex] || {};
                const inheritedColumnGroupHeader = (inheritedColumnGroup.header) ? inheritedColumnGroup.header : '';

                const columnToMergeLetter = `${this._utils.char.getExcelColumnLetterByIndex(i)}1`

                if (i == 0) {
                  xlsxData.groups.push({ 
                    header: columnGroupHeader,
                    columnsToMerge: [columnToMergeLetter]
                  });
                } else if ((inheritedColumnGroupHeader == columnGroupHeader) && isColumnGroupFrozen) {
                  const columnGroup = xlsxData.groups[columnGroupArrayIndex];

                  columnGroup.columnsToMerge.push(columnToMergeLetter);
                } else if ((inheritedColumnGroupHeader == columnGroupHeader) && !breakFrozenColumnGroup) {
                  const columnGroup = xlsxData.groups[columnGroupArrayIndex];
                  
                  columnGroup.columnsToMerge.push(columnToMergeLetter);              
                } else {
                  xlsxData.groups.push({
                    header: columnGroupHeader,
                    columnsToMerge: [columnToMergeLetter]
                  });

                  columnGroupArrayIndex++;
                }
              }
            });

            this._reportData.model?.data.forEach((row) => {
              let rowValue = {}

              columnKeys.forEach((key) => {
                rowValue[key] = String(row[key].value ?? '');
              });

              xlsxData.rows.push(rowValue);
            });

            const downloadButton = document.getElementById(modalId).closest('.ui-dialog').querySelector('.t-Button--hot');

            if (downloadButton) {
              downloadButton.classList.add('apex_disabled');

              downloadButton.innerHTML = `
                <span class="fa fa-circle-2-8 fa-anim-spin"></span> Baixando...
              `;
            };

            try {
              this._exportReport.exportXLSX(this.name, xlsxData);
            } catch (e) {
              this._utils.message.clearMessages();

              this._utils.message.showErrorMessage(`Erro ao exportar relatório: \n${e.message}`);
            };
          }
        }

        const modalConfig = { 
          modalId: modalId,
          modalTitle: 'Fazer Download',
          content: modalContent,
          modalHeight: 300,
          modalWidth: 300,
          modalButtons: [
            // {
            //   text: "Cancelar",
            //   click: (modal) => {
            //     modal.dialog("close");
            //   },
            // },
            {
              text: "Fazer download",
              class: "t-Button--hot",
              style: "background-color: #0b2636 !important; color: #FFFFFF !important;",
              click: (modal) => {
                const selectedReportExportType = document.querySelector('.ag-report-export-type[aria-selected="true"]');

                if (selectedReportExportType) {
                  const repotExportType = selectedReportExportType.getAttribute('data-type');

                  exportationFunctions[repotExportType]();
                }

                modal.dialog("close");
              }
            }
          ]
        };

        const popupConfig = [];

        if (this._data.options.toolbar.actions.showDownloadReport) {
          popupConfig.push({
            icon: "fa-download",
            label: "Fazer Download",
            callback: () => {
              this._utils.modal.callModal(modalConfig);
            }
          });
        }

        element.addEventListener('click', (event) => {

          this._utils.popup.calloutPopup(staticId, event.target.closest('.ag-toolbar-actions-button-container'), popupConfig);
        });
      },
      createActionsButton: (staticId) => {
        const actionsButton = document.createElement('button');

        actionsButton.className = 'ag-actions-button';

        actionsButton.setAttribute('type', 'button');

        actionsButton.innerHTML = '<span>Ações</span>';
        actionsButton.innerHTML += '<span style="font-size: 10px" class="fa fa-chevron-down"></span>';

        this._gridUtils.toolbarUtils.addActionsButtonEventListener(staticId, actionsButton);

        return actionsButton;
      }
    },

    groupColumnUtils: {
      frozenGroup: {
        applyStickyLeft: (staticId) => {
          let columnGroupLeft = 0;

          document.querySelectorAll(`#${staticId} .ag-col-group-header.ag-frozen-group`)?.forEach((columnGroup) => {
            columnGroup.style.left = `${columnGroupLeft}px`;

            columnGroupLeft += Math.round(columnGroup.getBoundingClientRect().width);
          });
        },
      },
      getColumnsByGroup: (staticId) => {
        const groupColumns = document.querySelectorAll(`#${staticId} .ag-col-group-header`);

        let blankColumnGroupsIndex = [];
        let i;

        if (groupColumns.length > 0) {
          for(i = 0; i < groupColumns.length; i++) {
            let columnChildrens = [];
            const groupColumn = groupColumns[i];

            const columnGroupChildrens = groupColumn.getAttribute('data-childrens');
            
            if (columnGroupChildrens) {
              columnGroupChildrens.split(',').forEach((dataChildren) => {
                const columnChildren = document.querySelector(`#${staticId} .ag-col-header[data-column*="${dataChildren}"]`);

                if (columnChildren) columnChildrens.push(columnChildren);
              });
            } else {
              blankColumnGroupsIndex.push(i);

              continue;
            }
          };
        };

        return blankColumnGroupsIndex;
      },
      someColumnHasGroup: (data) => {
        return Object.values(data.options.columns).some((column) => !!column.group);
      },
      resizeGroupColumns: (staticId) => {
        const groupColumns = document.querySelectorAll(`#${staticId} .ag-col-group-header`);

        let blankColumnGroupsIndex = [];

        let i;

        if (groupColumns.length > 0) {
          for(i = 0; i < groupColumns.length; i++) {
            let columnChildrens = [];
            const groupColumn = groupColumns[i];

            const columnGroupChildrens = groupColumn.getAttribute('data-childrens');
            
            if (columnGroupChildrens) {
              columnGroupChildrens.split(',').forEach((dataChildren) => {
                const columnChildren = document.querySelector(`#${staticId} .ag-col-header[data-column*="${dataChildren}"]`);

                if (columnChildren) columnChildrens.push(columnChildren);
              });
            } else {
              blankColumnGroupsIndex.push(i);

              continue;
            }

            const width = columnChildrens.reduce((width, columnChildren) => {
              return width + columnChildren.getBoundingClientRect().width;
            }, 0);

            groupColumn.style.flex = '0 0 auto';
            groupColumn.style.minWidth = `${width}px`;
            groupColumn.style.width = `${width}px`;
          };
        }

        const columnsElement = document.querySelectorAll(`#${staticId} .ag-col-header`);

        const columnsWithoutPagination = Object.values(this._data.options?.columns);
        const columnsData = columnsWithoutPagination.slice(0, columnsElement.length);

        const columnsWithoutGroupsIndex = columnsData.map((column, i) => (!column.group) ? i : null).filter((i) => i !== null);

        let arrayI = 0;

        let columnsByGroupIntersection = [[]];

        columnsWithoutGroupsIndex.forEach((value, index) => {
          if ((
                (columnsWithoutGroupsIndex[index-1] == value-1) && 
                (columnsWithoutGroupsIndex[index-1] != undefined)
              ) || 
              index == 0) {
            columnsByGroupIntersection[arrayI].push(value);
          } else if ((columnsWithoutGroupsIndex[index-1] != undefined)) {
            arrayI++;

            columnsByGroupIntersection.push([]);

            columnsByGroupIntersection[arrayI].push(value);
          }
        });

        blankColumnGroupsIndex.forEach((indexColumnGroup, i) => {
          const groupColumn = groupColumns[indexColumnGroup];

          const columnsByGroup = columnsByGroupIntersection[i];

          let groupColumnWidth = 0;

          columnsByGroup.forEach((indexColumn) => {
            const column = columnsElement[indexColumn];

            groupColumnWidth += column.getBoundingClientRect().width;
          });

          groupColumn.style.flex = '0 0 auto';
          groupColumn.style.minWidth = `${groupColumnWidth}px`;
          groupColumn.style.width = `${groupColumnWidth}px`;
        });
      },
      buildGroupColumn: (theme, frozen = false, header, groupId, columnChildren) => {
        const columnGroupHeader = document.createElement('div');

        columnGroupHeader.className = `ag-col-group-header ag-u-flex ${theme}`;

        if (frozen) columnGroupHeader.classList.add('ag-frozen-column');

        if (groupId) columnGroupHeader.setAttribute('data-id', groupId);

        if (columnChildren) columnGroupHeader.setAttribute('data-childrens', columnChildren);

        const columnGroupHeaderValue = document.createElement('div');

        columnGroupHeaderValue.className = 'ag-col-header-content ag-col-group-header-content';

        columnGroupHeaderValue.style.textAlign = 'center';

        if (header) {
          columnGroupHeaderValue.setAttribute('title', header);

          columnGroupHeaderValue.innerHTML = header;
        }

        columnGroupHeader.appendChild(columnGroupHeaderValue);

        return columnGroupHeader;
      }
    },

    columnUtils: {
      addColumnEventListeners: (staticId, data) => {
        if (this._columnEventListenerController) this._columnEventListenerController.abort();

        this._columnEventListenerController = new AbortController();

        document.querySelector(`#${staticId} .ag-container`).addEventListener('click', async (event) => {
          const rowContainer        = event.target.closest('.ag-row-container');
          const column              = event.target.closest('.ag-cell-container');
          
          if (!column) return;
            
          const rowColumnObjectName = column.getAttribute('data-column'); 

          const rowIndex            = parseInt(rowContainer.getAttribute('data-rownum')) -1;
          const rowColumnObject     = data?.model?.data[rowIndex][rowColumnObjectName];
          
          if (event.target.closest('.ag-link-column-container div')) {
            const columnDataUrl = event.target.closest('.ag-cell-container').getAttribute('data-url');

            if (columnDataUrl) {
              apex.navigation.redirect(columnDataUrl);
            } else {
              let newColumnDataUrl;

              const linkConfig = rowColumnObject.custom;

              try {
                newColumnDataUrl = await this._gridUtils.makeLinkURLRequest(
                  linkConfig.application, 
                  linkConfig.page, 
                  String(linkConfig.items).replaceAll(' ', ''),
                  linkConfig.values 
                );

                column.setAttribute('data-url', newColumnDataUrl);

                apex.navigation.redirect(newColumnDataUrl);
              } catch (err) {
                this._utils.message.clearMessages();
                this._utils.message.showErrorMessage(err);
    
                console.error('Erro ao gerar link:', err);
              }
            }
          }

          if (event.target.closest('.ag-context-menu-column div')) {
            const contextMenuConfigs = rowColumnObject.custom?.list;

            contextMenuConfigs.map((contextMenuConfig) => contextMenuConfig.callback = async () => {
              if (String(contextMenuConfig.type || 'LINK').toUpperCase() == 'LINK') {
                  try {
                    const dataUrl = await this._gridUtils.makeLinkURLRequest(
                      contextMenuConfig.application, 
                      contextMenuConfig.page, 
                      String(contextMenuConfig.items).replaceAll(' ', ''),
                      contextMenuConfig.values 
                    );

                    apex.navigation.redirect(dataUrl);
                  } catch (err) {
                    this._utils.message.clearMessages();
                    this._utils.message.showErrorMessage(err);
        
                    console.error('Erro ao gerar link:', err);
                  }
              }
            });
            
            this._utils.popup.calloutPopup(staticId, event.target.closest('.ag-context-menu-column span'), contextMenuConfigs);
          }
        }, 
        {
          signal: this._columnEventListenerController.signal
        });
      },
      headerUtils: {
        setStickyHeader: (staticId) => {
          this._gridUtils.columnUtils.headerUtils.createPlaceHolderHeader(staticId);

          $(`#${staticId} .ag-col-header-container`).stickyWidget();
        },
        createPlaceHolderHeader: (staticId) => {
          const colHeaderContainer = document.querySelector(`#${staticId} .ag-col-header-container`);

          $(colHeaderContainer).after(`<div class="ag-u-flex" style="width: ${colHeaderContainer.getBoundingClientRect().width}px;"></div>`);
        },
        buildColumnOrderBy: () => {
          this._columnHeaderOrderBy = document.createElement('div');

          this._columnHeaderOrderBy.className = 'ag-header-order-by';
          
          this._columnHeaderOrderByContainer = document.createElement('div');

          this._columnHeaderOrderByContainer.className = 'ag-header-order-by-container';

          this._orderByAscButton  = document.createElement('div');
          this._orderByDescButton = document.createElement('div');

          this._orderByAscButton.className  = 'ag-header-order-by-button';
          this._orderByDescButton.className = 'ag-header-order-by-button';

          this._orderByAscButton.setAttribute('orderby-type', 'ASC');
          this._orderByDescButton.setAttribute('orderby-type', 'DESC');

          this._orderByAscButton.setAttribute('title', 'Classificar por ordem crescente');
          this._orderByDescButton.setAttribute('title', 'Classificar por ordem decrescente');

          this._orderByAscButton.innerHTML  = '<span class="fa fa-chevron-up" style="font-size: inherit;"></span>';
          this._orderByDescButton.innerHTML = '<span class="fa fa-chevron-down" style="font-size: inherit;"></span>';

          this._columnHeaderOrderByContainer.appendChild(this._orderByAscButton);
          this._columnHeaderOrderByContainer.appendChild(this._orderByDescButton);

          return this._columnHeaderOrderBy;
        },
        setColumnPopupOptions: (staticId) => {
          // TO DO

          // document.querySelectorAll(`#${staticId} .ag-col-header`).forEach((columnHeader) => {
          //   this._utils.popup.calloutPopup(columnHeader);
          // });
        },
        applyStickyTop: (staticId) => {
          const navbar = document.querySelector('.t-Header-branding');

          let navbarHeight = (navbar) ? navbar.offsetHeight : 0;

          if (navbarHeight) {
            const columGroupWrapper       = document.querySelector(`#${staticId} .ag-group-wrapper`);
            const columGroupWrapperHeight = (columGroupWrapper) ? columGroupWrapper.offsetHeight : 0;

            if (columGroupWrapper) columGroupWrapper.style.top = `${navbarHeight}px`;
            
            document.querySelector(`#${staticId} .ag-header-wrapper`).style.top = `${navbarHeight + columGroupWrapperHeight}px`;
          }
        }
      },
      buildRowColumn: (rowColumnData, columnsOptions, columnName, style = 'ag-slim') => {
        this._columnOption = columnsOptions[columnName] 
                          || columnName[columnName.toUpperCase()] 
                          || columnsOptions[columnName.toLowerCase()] 
                          || null;      

        if (!this._columnOption) {
          errorMessage = `Opções para a coluna "${columnName.toUpperCase()}" não encontrada.`;

          this._utils.message.showErrorMessage(errorMessage);

          throw new Error(errorMessage);
        }

        if (!this._columnDOMConfig[columnName]) {
          let definedWidth = this._columnOption.width;
          let headerElement = document.getElementById(this._columnOption.staticId);
          let finalWidth = definedWidth ? `${definedWidth}px` : (headerElement ? `${headerElement.getBoundingClientRect().width}px` : 'auto');

          this._columnDOMConfig[columnName] = {
            "width": finalWidth,
            // "width": `${document.getElementById(this._columnOption.staticId).getBoundingClientRect().width}px`,
            "height": `${document.getElementById(this._columnOption.staticId).getBoundingClientRect().height}px`,
          }
        }

        this._rowColumnContainer = document.createElement('div');
        
        this._rowColumnContainer.className    = `ag-cell-container ${style}`;

        if (this._columnOption.frozen) this._rowColumnContainer.classList.add('ag-frozen-column');

        if (this._columnOption.readOnlyStyle) this._rowColumnContainer.classList.add('ag-read-only-column');

        this._rowColumnContainer.style.textAlign = this._columnOption.alignment.toLowerCase() || 'start';

        // if (String(pRowColumnData.custom?.displayType).toLowerCase() == 'link') this._rowColumnContainer.style.textAlign = 'center';

        this._rowColumnContainer.style.width     = this._columnDOMConfig[columnName].width;

        if (this._columnOption.width) {
            this._rowColumnContainer.style.minWidth = this._columnDOMConfig[columnName].width;
            this._rowColumnContainer.style.flex = `0 0 ${this._columnDOMConfig[columnName].width}`;
        }
        // rowColumnContainer.style.width     = document.getElementById(columnOption.staticId).getBoundingClientRect().width;
        this._rowColumnContainer.style.height    = this._columnDOMConfig[columnName].height;

        this._rowColumnContainer.setAttribute('data-column-header-id', this._columnOption.staticId);
        this._rowColumnContainer.setAttribute('data-column', columnName);
        
        // if (rowColumnData.custom) {
          if (rowColumnData.custom) this._customColumnData = rowColumnData.custom;

          if ((this._customColumnData?.displayType || 'NORMAL') == 'NORMAL') {
            this._rowColumnContainer.appendChild(
              this._gridUtils.columnUtils.cellUtils.buildCell(
                String(this._customColumnData?.icon || '').toLowerCase(), 
                this._utils.escapeHtml(rowColumnData.value), 
                this._customColumnData?.alignment || 'left'
              )
            );
          } else if (String(this._customColumnData.displayType).toUpperCase() == "BADGE") {
            if (rowColumnData.value) {
              if (["danger", "warning", "success", "info"].includes(String(this._customColumnData.badgeColor).toLowerCase())) {
                this._badgeColor = this._utils.color.getTemplateColor(this._customColumnData.badgeColor)?.color;
                this._fontColor  = this._utils.color.getTemplateColor(this._customColumnData.badgeColor)?.fontColor;
              } else {
                this._badgeColor = this._customColumnData.badgeColor;
                this._fontColor  = (this._customColumnData.fontColor) ? this._customColumnData.fontColor : this._utils.color.getContrastYIQ(this._customColumnData.fontColor);
              }

              this._rowColumnContainer.appendChild(
                this._gridUtils.columnUtils.cellUtils.buildBadgeCell(
                  this._utils.escapeHtml(rowColumnData.value),
                  this._badgeColor,
                  this._fontColor,
                  (this._customColumnData.badgeType || 1),
                  String(style ?? 'ag-slim').toLowerCase()            
                )
              );

              this._rowColumnContainer.style.minWidth = '120px';

              if (document.getElementById(this._columnOption.staticId)) document.getElementById(this._columnOption.staticId).style.minWidth = '120px';             
            }
          } else if (String(this._customColumnData.displayType).toUpperCase() == 'LINK') {
            this._rowColumnContainer.appendChild(
              this._gridUtils.columnUtils.cellUtils.buildLinkCell(this._customColumnData.icon, this._utils.escapeHtml(rowColumnData.value), this._customColumnData.alignment, String(style ?? 'ag-slim').toLowerCase())
            );
          } else if (String(this._customColumnData.displayType).toUpperCase() == 'CONTEXT-MENU') {
            this._rowColumnContainer.appendChild(
              this._gridUtils.columnUtils.cellUtils.buildContextCell(
                String(this._customColumnData.icon).toLowerCase(), 
                this._utils.escapeHtml(rowColumnData.value), 
                String(this._customColumnData.alignment).toLowerCase(),
                String(style ?? 'ag-slim').toLowerCase()
              )
            );
          }
        // }
        // else {
          // this._rowColumnContainer.innerHTML = this._utils.escapeHtml(pRowColumnData.value);
        // }

        this._customColumnData = null;

        return this._rowColumnContainer;
      },
      cellUtils: {
        buildCell: (icon = '', label = '', iconAlignment = 'left', className = '') => {
          const createLabel = (label) => {
            this._labelCell = document.createElement('span');

            this._labelCell.className = 'ag-label-cell';

            this._labelCell.innerHTML = label || '';

            return this._labelCell;
          }

          this._cellContainer = document.createElement('div');

          if (className) this._cellContainer.className = className;

          this._IconCell      = document.createElement('span');

          this._IconCell.className = `ag-icon-cell fa ${icon}`;

          this._IconCell.style.fontSize = 'inherit';

          this._cellContainer.appendChild(this._IconCell); 

          if (((iconAlignment ?? 'left') == 'left') && (label != '')) {
            this._cellContainer.insertAdjacentElement('beforeend', createLabel(label));
          } else if (((iconAlignment ?? 'right') == 'right') && (label != '')) { 
            this._cellContainer.insertAdjacentElement('afterbegin', createLabel(label));
          }

          return this._cellContainer;
        },
        buildLinkCell: (icon, label, alignment, style = 'ag-slim') => {
          this._columnContainer = document.createElement('div');

          this._columnContainer.className = `ag-link-column-container ${style}`;

          this._columnContainer.appendChild(this._gridUtils.columnUtils.cellUtils.buildCell(icon, label, alignment));

          return this._columnContainer;
        },
        buildBadgeCell: (value, badgeColor = '#9500BA', fontColor = "#FFFFFF", type = 1, style = 'ag-slim') => {
          this._badgeColumnContainer = document.createElement('div');
          
          this._badgeColumnContainer.className = `ag-badge-column-container ${style}`;

          this._badgeColumn = document.createElement('div');

          this._badgeColumn.className = 'ag-badge-column';

          if (type == 2) {
            this._badgeColumnColor  = this._utils.color.reduceHexOpacity(badgeColor, '0.3');

            this._badgeColumn.style.border = `solid 2px ${badgeColor}`;
          } else {
            this._badgeColumnColor      = badgeColor;
          }

          this._badgeColumn.style.backgroundColor = this._badgeColumnColor;
          this._badgeColumn.style.color           = (type != 2) ? fontColor : badgeColor;

          this._badgeColumn.innerHTML = value;

          this._badgeColumnContainer.appendChild(this._badgeColumn);

          return this._badgeColumnContainer;
        },
        buildContextCell: (icon, label = '', iconAlignment = 'left', style = 'ag-slim') => {
          this._columnContainer = document.createElement('div');

          this._columnContainer.className = `ag-context-menu-column ${style}`;

          this._columnContainer.appendChild(this._gridUtils.columnUtils.cellUtils.buildCell(icon, label, iconAlignment, style, 'ag-context-menu'));

          return this._columnContainer;
        }
      },
      setColumnsId: () => {
        const keys = Object.keys(this._data.options.columns);

        keys.forEach((key) => {
          if (!this._data.options.columns[key].staticId) this._data.options.columns[key].staticId = this._utils.random.getRandomId();
        });
      },
      frozenColumn: {
        configurateFrozenColumns: (staticId) => {
          this._gridUtils.columnUtils.frozenColumn.validateAllFrozenColumn(staticId);
          this._gridUtils.columnUtils.frozenColumn.setLastFrozenColumnClass(staticId);
          this._gridUtils.columnUtils.frozenColumn.applyStickyLeft(staticId);
        },
        setLastFrozenColumnClass: (staticId) => {
          let agFrozenColumnHeaders = document.querySelectorAll(`#${staticId} .ag-col-header.ag-frozen-column`);
          let agFrozenColumns;

          if ((agFrozenColumnHeaders.length -1) >= 0) {
            agFrozenColumnHeaders[agFrozenColumnHeaders.length-1].classList.add('ag-frozen-column-last');
          };

          document.querySelectorAll(`#${staticId} .ag-row-container:has(.ag-frozen-column)`)?.forEach((rowContainer) => {
            agFrozenColumns = rowContainer.querySelectorAll('.ag-cell-container.ag-frozen-column');

            if ((agFrozenColumns.length -1) >= 0) {
              agFrozenColumns[agFrozenColumns.length-1].classList.add('ag-frozen-column-last');
            }
          });
        },
        applyStickyLeft: (staticId) => {
          let firstAGRowFrozenColumnContainer = document.querySelector(`#${staticId} .ag-row-container:has(.ag-frozen-column)`);

          if (!firstAGRowFrozenColumnContainer) return;

          const frozenColumns = [...firstAGRowFrozenColumnContainer.querySelectorAll('.ag-cell-container.ag-frozen-column')];

          let frozenColumnLeftCSSValue = 0;
          let frozenColumnWidth;
          let frozenColumnIndex;
          let column;
          let columnHeader;

          frozenColumns.forEach((frozenColumn, i) => {
            frozenColumnWidth = frozenColumn.offsetWidth;

            frozenColumnIndex = [...frozenColumn.parentNode.children].indexOf(frozenColumn);

            document.querySelectorAll(`#${staticId} .ag-row-container:has(.ag-frozen-column)`)?.forEach((agRowContainer) => {
              column = agRowContainer.children[frozenColumnIndex];

              if (!column) return;

              column.style.left = `${frozenColumnLeftCSSValue}px`;
              column.style.zIndex = 10 - frozenColumnIndex;

              columnHeader = document.querySelector(`#${staticId} .ag-col-header-container:has(.ag-frozen-column)`).children[frozenColumnIndex];

              if (!columnHeader) return;

              columnHeader.style.left   = `${frozenColumnLeftCSSValue}px`;
              columnHeader.style.zIndex = 10 - frozenColumnIndex; 
            });

            frozenColumnLeftCSSValue += frozenColumnWidth;
          });
        },
        validateAllFrozenColumn: (staticId) => {
          let agRowsFrozenColumnContainer = document.querySelectorAll(`#${staticId} .ag-row-container:has(.ag-frozen-column)`);

          if (agRowsFrozenColumnContainer.length == 0) return;

          let agCellContainers;
          let i;

          const agFrozenColumn = agRowsFrozenColumnContainer[0].querySelectorAll('.ag-cell-container.ag-frozen-column');

          const lastAGFrozenColumnIndex = [...agRowsFrozenColumnContainer[0]?.querySelectorAll('.ag-cell-container')].indexOf(
            agFrozenColumn[agFrozenColumn.length-1]
          );

          let columnHeaders = document.querySelectorAll(`#${staticId} .ag-col-header-container .ag-col-header`);

          for(i = 0; i <= lastAGFrozenColumnIndex; i++) {
            columnHeaders[i].classList.add('ag-frozen-column');
          }

          agRowsFrozenColumnContainer.forEach((agRowFrozenColumnContainer) => {
            agCellContainers = agRowFrozenColumnContainer.querySelectorAll('.ag-cell-container');

            for(i = 0; i <= lastAGFrozenColumnIndex; i++) {
              agCellContainers[i]?.classList.add('ag-frozen-column');
            }
          });
        }
      }
    },

    footerUtils: {
      resizePlaceholderVirtualScroll: (staticId) => {
        const bodyWrapper     = document.querySelector(`#${staticId} .ag-body-wrapper`);
        const scroller        = document.querySelector(`#${staticId} .ag-footer-wrapper`);

        let scrollerPlaceHolder = scroller.querySelector('.ag-footer-scroll');
        let firstRowContainer   = bodyWrapper.querySelector('.ag-row-container');

        if (firstRowContainer) scrollerPlaceHolder.style.width = `${firstRowContainer.offsetWidth}px`;
      },
      buildPaginationFooter: (data) => {
        function buildPageButton(icon = '', text = '', dataPage = '') {
          let pageButton = document.createElement('div');

          pageButton.className = `ag-page-btn`;

          if (icon != '') pageButton.innerHTML = `<span class="fa ${icon}"></span>`;

          if (text != '') pageButton.innerHTML += `<span>${text}</span>`;

          if (dataPage != '') pageButton.setAttribute('data-page', dataPage);

          return pageButton;
        }

        let fragment = document.createDocumentFragment();

        let paginationFooterContainer = document.createElement('div');

        paginationFooterContainer.className = 'ag-pagination-footer-container';

        let paginationLabelsContainer = document.createElement('div');

        paginationLabelsContainer.className = 'ag-pagination-labels-container';

        paginationLabelsContainer.innerText = `1 - ${data.options?.paginations?.rows?.pagination} de ${data.model?.data?.length || 0}`;

        paginationFooterContainer.appendChild(paginationLabelsContainer);

        let paginationPagesContainer = document.createElement('div');

        paginationPagesContainer.className = 'ag-pagination-pages-container';

        let firstPageButton    = buildPageButton('fa-angle-double-left');
        let previousPageButton = buildPageButton('fa-angle-left');

        firstPageButton.classList.add('ag-first-page-button');
        firstPageButton.classList.add('ag-u-hidden');

        previousPageButton.classList.add('ag-previous-page-button');
        previousPageButton.classList.add('ag-u-hidden');

        paginationPagesContainer.appendChild(firstPageButton);
        paginationPagesContainer.appendChild(previousPageButton);

        let pageButton;
        let i;

        paginationPagesContainer.innerHTML += '<span class="ag-previous-pages-button-etc ag-u-hidden">...</span>';

        for (i = 1; i <= Math.ceil(data.model.data.length / data.options.paginations.rows.pagination); i++) {
          pageButton = buildPageButton('', String(i), i);
          pageButton.classList.add('ag-select-page-button');

          if (i == 1) {
            pageButton.classList.add('ag-selected-page-button');
          }

          if (i > 5) {
            pageButton.classList.add('ag-u-hidden');
          }

          paginationPagesContainer.appendChild(pageButton);
        }
        
        i--;

        if (i > 5) {
          paginationPagesContainer.innerHTML += '<span class="ag-next-pages-button-etc">...</span>';
       
          let nextPageButton = buildPageButton('fa-angle-right');
          let lastPageButton = buildPageButton('fa-angle-double-right');

          nextPageButton.classList.add('ag-next-page-button');
          lastPageButton.classList.add('ag-last-page-button');

          paginationPagesContainer.appendChild(nextPageButton);
          paginationPagesContainer.appendChild(lastPageButton);
        }

        paginationFooterContainer.appendChild(paginationPagesContainer);

        fragment.appendChild(paginationFooterContainer);

        return fragment;
      },
      addEventsListenersToPaginationButtons: (staticId, data = null) => {
        let renderedColumns;

        let firstPageButton    = document.querySelector(`#${staticId} .ag-first-page-button`);
        let previousPageButton = document.querySelector(`#${staticId} .ag-previous-page-button`);

        let selectPageButtons  = document.querySelectorAll(`#${staticId} .ag-select-page-button`);

        let nextPageButton     = document.querySelector(`#${staticId} .ag-next-page-button`);
        let lastPageButton     = document.querySelector(`#${staticId} .ag-last-page-button`);

        firstPageButton?.addEventListener('click', () => {
          this._agBody.rowsContainer.innerHTML = '';

          let offset     = 0;
          let pagination = data.options.paginations.rows.pagination;

          try {
            this.buildAGBodyRow(this._agBody.rowsContainer, data, offset, pagination-1);
          } catch (error) {
            this._utils.message.clearMessages();
            this._utils.message.showErrorMessage('Falha ao acessar a primeira página da grade');

            console.error(error);

            return;
          }

          document.querySelectorAll(`#${staticId} .ag-page-btn.ag-select-page-button:not(.ag-u-hidden)`)?.forEach((selectPageButton) => {
            selectPageButton.classList.add('ag-u-hidden');
          });

          for (let i = offset; i <= pagination -1; i++) {
            document.querySelectorAll(`#${staticId} .ag-select-page-button`)[i]?.classList.remove('ag-u-hidden');
          }

          document.querySelector(`#${staticId} .ag-selected-page-button`)?.classList.remove('ag-selected-page-button');

          selectPageButtons[0].classList.add('ag-selected-page-button');

          if (selectPageButtons.length > 5) document.querySelector(`#${staticId} .ag-next-pages-button-etc.ag-u-hidden`)?.classList.toggle('ag-u-hidden');

          document.querySelector(`#${staticId} .ag-page-btn.ag-first-page-button:not(.ag-u-hidden)`)?.classList.toggle('ag-u-hidden');
          document.querySelector(`#${staticId} .ag-page-btn.ag-previous-page-button:not(.ag-u-hidden)`)?.classList.toggle('ag-u-hidden');

          document.querySelector(`#${staticId} .ag-page-btn.ag-next-page-button.ag-u-hidden`)?.classList.toggle('ag-u-hidden');
          document.querySelector(`#${staticId} .ag-page-btn.ag-last-page-button.ag-u-hidden`)?.classList.toggle('ag-u-hidden');
        
          document.querySelector(`#${staticId} .ag-previous-pages-button-etc`).classList.add('ag-u-hidden');

          data.options.paginations.rows.page = 1;

          this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(staticId);
        
        });

        previousPageButton?.addEventListener('click', () => {
          let page = Number(document.querySelector(`#${staticId} .ag-page-btn.ag-select-page-button.ag-selected-page-button`)?.getAttribute('data-page'));
          
          document.querySelector(`#${staticId} .ag-page-btn.ag-select-page-button[data-page="${page-1}"]`)?.dispatchEvent(new Event('click'));
        });

        selectPageButtons.forEach((selectPageButton) => {
          selectPageButton?.addEventListener('click', (event) => {
            const clickedIndex = Array.from(selectPageButtons).indexOf(event.currentTarget);

            renderedColumns = document.querySelectorAll(`#${staticId} .ag-col-header`)

            this._agBody.rowsContainer.innerHTML = '';

            let page       = parseInt(event.currentTarget.getAttribute('data-page'));
            let pagination = data.options.paginations.rows.pagination;

            let offset = (page - 1) * pagination;

            try {
              this.buildAGBodyRow(this._agBody.rowsContainer, data, offset, pagination-1);
            } catch (error) {
              this._utils.message.clearMessages();
              this._utils.message.showErrorMessage('Falha ao acessar página');

              console.error(error);
            }

            document.querySelectorAll(`#${staticId} .ag-selected-page-button`).forEach((selectedPageButton) => {
              selectedPageButton.classList.remove('ag-selected-page-button');
            });

            event.currentTarget?.classList.add('ag-selected-page-button');

            let showPreviousAndFirstPageButton = false;
            let showNextAndLastPageButton      = false;

            // Clicou na primeira página
            if (selectPageButtons[clickedIndex-2]?.classList.contains('ag-u-hidden')) {
              selectPageButtons[clickedIndex+3]?.classList.add('ag-u-hidden');
              selectPageButtons[clickedIndex-2]?.classList.remove('ag-u-hidden');

              showNextAndLastPageButton = true;
            }
            
            // Clicou na segunda página
            if (selectPageButtons[clickedIndex-1]?.classList.contains('ag-u-hidden')) {
              selectPageButtons[clickedIndex+4]?.classList.add('ag-u-hidden');

              selectPageButtons[clickedIndex-1]?.classList.remove('ag-u-hidden');
              selectPageButtons[clickedIndex-2]?.classList.remove('ag-u-hidden');

              showNextAndLastPageButton = true;
            }

            // Clicou na penultima página
            if (selectPageButtons[clickedIndex+2]?.classList.contains('ag-u-hidden')) {
              selectPageButtons[clickedIndex-3]?.classList.add('ag-u-hidden');
              selectPageButtons[clickedIndex+2]?.classList.remove('ag-u-hidden');

              showPreviousAndFirstPageButton = true;
            }

            // Clicou na ultima página
            if (selectPageButtons[clickedIndex+1]?.classList.contains('ag-u-hidden')) {
              selectPageButtons[clickedIndex-4]?.classList.add('ag-u-hidden');

              selectPageButtons[clickedIndex+1]?.classList.remove('ag-u-hidden');
              selectPageButtons[clickedIndex+2]?.classList.remove('ag-u-hidden');

              showPreviousAndFirstPageButton = true;
            }

            if (showPreviousAndFirstPageButton) {
              previousPageButton?.classList.remove('ag-u-hidden');
              firstPageButton?.classList.remove('ag-u-hidden');

              document.querySelector(`#${staticId} .ag-previous-pages-button-etc`)?.classList.remove('ag-u-hidden');
            }

            if (!selectPageButtons[clickedIndex+1] || !selectPageButtons[clickedIndex+2] || !selectPageButtons[clickedIndex+3]) {
              nextPageButton?.classList.add('ag-u-hidden');
              lastPageButton?.classList.add('ag-u-hidden');

              document.querySelector(`#${staticId} .ag-next-pages-button-etc`)?.classList.add('ag-u-hidden');
            }         

            if (showNextAndLastPageButton) {
              nextPageButton?.classList.remove('ag-u-hidden');
              lastPageButton?.classList.remove('ag-u-hidden');

              document.querySelector(`#${staticId} .ag-next-pages-button-etc`)?.classList.remove('ag-u-hidden');
            }

            if (!selectPageButtons[clickedIndex-1] || !selectPageButtons[clickedIndex-2] || !selectPageButtons[clickedIndex-3]) {
              previousPageButton?.classList.add('ag-u-hidden');
              firstPageButton?.classList.add('ag-u-hidden');

              document.querySelector(`#${staticId} .ag-previous-pages-button-etc`)?.classList.add('ag-u-hidden');
            }

            this._data.options.paginations.rows.page = Number(event.currentTarget.getAttribute('data-page'));

            this._gridUtils.setAutoResize(staticId);
            this._utils.event.triggerWindowResize();

            this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(staticId);
          });
        });

        nextPageButton?.addEventListener('click', () => {
          let page = Number(document.querySelector(`#${staticId} .ag-page-btn.ag-select-page-button.ag-selected-page-button`)?.getAttribute('data-page'));
          
          document.querySelector(`#${staticId} .ag-page-btn.ag-select-page-button[data-page="${page+1}"]`)?.dispatchEvent(new Event('click'));
        });

        lastPageButton?.addEventListener('click', () => {
          this._agBody.rowsContainer.innerHTML = '';

          let offset     = data.model.data.length - data.options.paginations.rows.pagination;
          let pagination = data.options.paginations.rows.pagination;

          try {
            this.buildAGBodyRow(this._agBody.rowsContainer, data, offset, pagination);
          } catch (error) {
            this._utils.message.clearMessages();
            this._utils.message.showErrorMessage('Falha ao acessar a ultima página da grade');

            console.error(error);

            return;
          }

          document.querySelectorAll(`#${staticId} .ag-page-btn.ag-select-page-button:not(.ag-u-hidden)`)?.forEach((selectPageButton) => {
            selectPageButton.classList.add('ag-u-hidden');
          });

          let offsetSelectPageButtons = selectPageButtons.length - 5;

          for (let i = offsetSelectPageButtons; i <= selectPageButtons.length; i++) {
            document.querySelectorAll(`#${staticId} .ag-select-page-button`)[i]?.classList.remove('ag-u-hidden');
          }

          document.querySelector(`#${staticId} .ag-page-btn.ag-select-page-button.ag-selected-page-button`).classList.remove('ag-selected-page-button');

          selectPageButtons[selectPageButtons.length -1]?.classList.add('ag-selected-page-button');

          document.querySelector(`#${staticId} .ag-previous-pages-button-etc`)?.classList.remove('ag-u-hidden');
          document.querySelector(`#${staticId} .ag-next-pages-button-etc`)?.classList.add('ag-u-hidden');

          document.querySelector(`#${staticId} .ag-page-btn.ag-first-page-button`)?.classList.remove('ag-u-hidden');
          document.querySelector(`#${staticId} .ag-page-btn.ag-previous-page-button`)?.classList.remove('ag-u-hidden');
          
          document.querySelector(`#${staticId} .ag-page-btn.ag-next-page-button`)?.classList.add('ag-u-hidden');
          document.querySelector(`#${staticId} .ag-page-btn.ag-last-page-button`)?.classList.add('ag-u-hidden');
        
          data.options.paginations.rows.page = selectPageButtons.length;

          this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(staticId);
        });
      },
      setPaginationLabel: (staticId, data, offset, pagination) => {
        let paginationLabelsContainer = document.querySelector(`#${staticId} .ag-pagination-labels-container`);

        if (paginationLabelsContainer) paginationLabelsContainer.innerText = `${offset+1} - ${pagination} de ${data.model.data.length || 0}`;
      }
    },
    makeLinkURLRequest: async (application = apex.item('pFlowId').getValue(), page = apex.item('pFlowStepId').getValue(), items = '', values = '') => {
      const jsonValue = {
        "application"  : application,
        "page"         : page,
        "items"        : items,
        "values"       : values
      };

      return new Promise((resolve, reject) => {
         apex.server.plugin(
          this._ajaxId,
          {
            x01: 'getLink',
            x02: JSON.stringify(jsonValue)
          },
          {
            success: (res) => {
              if (res.data && typeof res.data == 'string' && res.data.trim() !== '') {
                resolve(res.data);
              } else {
                reject('O link gerado é inválido ou vazio.');
              }
            },
            error: (err) => {
              console.error(err);

              this._utils.message.clearMessages();

              this._utils.message.showErrorMessage();

              if (err.responseText) this._utils.message.showErrorMessage(`Erro ao consultar JSON: \n ${err.responseText}`);
           
              reject(err);
            }
          }
        );
      });
    },
    setResizableColumn: (staticId) => {
      const applyStickLeft = this._gridUtils.columnUtils.frozenColumn.applyStickyLeft;

      const resizeGroupColumns = this._gridUtils.groupColumnUtils.resizeGroupColumns;

      const getPagination = () => {
        return this.options?.paginations?.columns.paginations;
      };

      $('.ag-col-resizable').each(function() {
        const $header  = $(this);
        const columnId = $header.attr('id');

        $header.resizable({
          handles: 'e',
          minWidth: 50,
          start: function() {
            $(this).css('flex', '0 0 auto');
          },
          alsoResize: $(`.ag-cell-container[data-column-header-id="${columnId}"]`),
          stop: function(event, ui) {
            const newWidth = ui.size.width;

            $(`.ag-cell-container[data-column-header-id="${columnId}"]`).css({'width': `${newWidth}px`, flex: '0 0 auto'});

            applyStickLeft(staticId);

            window.dispatchEvent(new Event('resize'));

            resizeGroupColumns(staticId);
          }
        });
      });
    }
  }
}

class ExportReport {
  _workbook;

  _utils;

  constructor() {
    this._workbook = new ExcelJS.Workbook();

    this._utils = new Utils;
  }

  /**
  *  @Param filename: string
  *  @Param data: { worksheetName: string, groups: Array, columns: Object, rows: Object }
  */

  async exportXLSX(filename, data) {
    console.log(data);

    const worksheet = this._workbook.addWorksheet(data.worksheetName);

    const hasGroupColumn = data.groups && data.groups.length;
    
    const columnHeaderRowIndex = (hasGroupColumn) ? 2 : 1;
    const rowsToFrozen         = columnHeaderRowIndex;

    worksheet.columns = data.columns;

    // Moves to the row bellow
    if (hasGroupColumn) worksheet.spliceRows(1, 0, []);

    if (hasGroupColumn) {
      for(let i = 1; i < data.columns.length; i++) {
        worksheet.getRow(2).getCell(i+1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEEEEEE" }
        };
      };
    }

    if (hasGroupColumn) {
      const columnGroupRow = worksheet.getRow(1);
      const getWordsRegex  = new RegExp(/[0-9]/g);

      data.groups.forEach((group) => {

        const firstColumnGroupToMerge       = group.columnsToMerge[0];
        const firstColumnGroupToMergeLetter = firstColumnGroupToMerge.replace(getWordsRegex, '');
        const lastColumnGroupToMerge        = group.columnsToMerge[group.columnsToMerge.length-1];

        columnGroupRow.getCell(firstColumnGroupToMergeLetter).value = group.header;

        columnGroupRow.getCell(firstColumnGroupToMergeLetter).alignment = { horizontal: 'center', vertical: 'middle' };

        group.columnsToMerge.forEach((columnToMerge) => {
          columnGroupRow.getCell(columnToMerge.replace(getWordsRegex, '')).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEEEEEE" }
          };
        });

        if (group.columnsToMerge.length > 1) worksheet.mergeCells(`${firstColumnGroupToMerge}:${lastColumnGroupToMerge}`);
      });
    }

    worksheet.views = [
      {
        state: 'frozen',
        ySplit: rowsToFrozen
      }
    ]

    if(data.frozen) worksheet.views[0].xSplit = data.frozen;

    data.rows.forEach((rowValue) => {
      const { custom, ...row } = rowValue;

      worksheet.addRow(row);
    });

    const endRowLoop = (hasGroupColumn) ? data.rows.length+2 : data.rows.length+1;

    for(let i = 1; i <= endRowLoop; i++) {
      data.columns.forEach((column, j) => {
        worksheet.getRow(i).getCell(j+1).alignment = data.custom[j].alignment;

        worksheet.getRow(i).getCell(j+1).border = {
          top: {
            style: "thin",
            color: { argb: "FF000000" }
          },
          left: {
            style: "thin",
            color: { argb: "FF000000" }
          },
          bottom: {
            style: "thin",
            color: { argb: "FF000000" }
          },
          right: {
            style: "thin",
            color: { argb: "FF000000" }
          }
        }
      });
    }

    // Column header filter. Like the IG generates when exports to .xlsx
    worksheet.autoFilter = {
      from: `A${columnHeaderRowIndex}`,
      to: {
        row: columnHeaderRowIndex,
        column: data.columns.length
      }
    }

    const buffer = await this._workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
    this._utils.link.downloadBlob(blob, `${filename}.xlsx`);

    this._workbook = new ExcelJS.Workbook();
  }


}

class Utils {
  constructor() {}

  _templateColorType = {
    "DANGER": {
      "color": "#CB1100",
      "fontColor:": "#FFFFFF",
    },
    "WARNING": {
      "color": "#FFC628",
      "fontColor": "#2B2B2B",
    },
    "SUCCESS": {
      "color": "#278701",
      "fontColor": "#FFFFFF"
    },
    "INFO": {
      "color": "#056AC8",
      "fontColor": "#FFFFFF"
    },
    "PRIMARY": {
      "color": "#056AC8",
      "fontColor": "#FFFFFF"
    },
  };

  dev = {
    isDevMode: () => {
      return (!!document.getElementById('apexDevToolbar'));
    }
  }

  escapeHtml = (value) => {
    return ((String(value) != '') && (value !== undefined) && (value !== null)) ? apex.util.escapeHTML(String(value)) : '';
  }

  elements = {
    getElement: (target) => {
      if (typeof target == 'string') {
        return document.querySelector(target);
      }

      if (target instanceof Element) {
        return target
      }

      return null;
    }
  }

  message = 
  {
    clearMessages: () => {
      apex.message.clearErrors();
    },
    showErrorMessage: (message) => {
      apex.message.showErrors(
        {
          "type": apex.message.TYPE.ERROR,
          "location": ["page"],
          "message": message,
          "unsafe": true,
        }
      );
    }
  };

  modal = {
    callModal: ({ 
      modalId = this.random.getRandomId(),
      modalTitle,
      content,
      modalHeight,
      modalWidth,
      modalButtons,
      closeCallback
    }) => {
      const modalContainer = document.createElement('div');

      const {  } = modalButtons;
      
      modalContainer.className = 'ag-modal-content';

      modalContainer.setAttribute('id', modalId);
      modalContainer.setAttribute('title', modalTitle);

      const contentElement = this.elements.getElement(content);

      if (contentElement) modalContainer.appendChild(contentElement);

      document.querySelector('body').appendChild(modalContainer);

      const modalButtonsJSON = [];

      modalButtons.forEach((modalButton) => {
        modalButtonsJSON.push({
          class: modalButton.class,
          style: modalButton.style,
          text: modalButton.text,
          click: function () {
            modalButton.click($(this));
          }
        })
      });

      const modal = $(modalContainer).dialog({
        autoOpen: false,
        minHeight: modalHeight,
        height: modalHeight,
        minWidth: modalWidth,
        width: modalWidth,
        resizable: false,
        modal: true,
        buttons: modalButtonsJSON,
        close: closeCallback
      });

      modal.dialog("open");
    }
  }

  popup = {
    /**
    *  @Param pElement:     { HTMLElement | String } 
    *  @Param contentList: { Array & Object }
    *  @Param elementId:   { Static ID }
    */
    calloutPopup: (staticId, pElement, contentLists = [], elementId = this.random.getRandomId()) => {
      let element = this.elements.getElement(pElement);

      if (!element) return;

      if (!document.querySelector(`.ag-popup-frame-container[data-id="${elementId}"]`)) {
        let elementBoundingClientRect = pElement.getBoundingClientRect();
        let popupFrame = document.createElement('div');
      
        popupFrame.className = 'ag-popup-frame-container';
      
        popupFrame.setAttribute('data-id', elementId);

        // if (pContent) popupFrame.innerHTML = pContent;
        let contentListContainer;
        let contentListItem;
        let contentListItemIcon;
        let contentListItemLabel;

        contentListContainer = document.createElement('div');

        contentListContainer.className = 'ag-popup-list'

        contentLists.forEach((contentList) => {
          if ((contentList.type ?? 'item') == 'item') {
            contentListItem = document.createElement('div');

            contentListItem.classList.add('ag-popup-item');

            contentListItemIcon = document.createElement('div');

            contentListItemIcon.className = 'ag-popup-item-icon';

            contentListItemIcon.innerHTML = '<span></span>';

            contentListItemIcon.querySelector('span').className = `fa ${contentList.icon}`;

            contentListItemLabel = document.createElement('div');

            contentListItemLabel.className = 'ag-popup-item-label';

            contentListItemLabel.innerHTML = '<span></span>';

            contentListItemLabel.querySelector('span').innerText = contentList.label;

            contentListItem.appendChild(contentListItemIcon);
            contentListItem.appendChild(contentListItemLabel);

            contentListItem.addEventListener('click', contentList.callback);

            contentListContainer.appendChild(contentListItem);
          
            // contentListItem = '';
          } else if (contentList.type == 'divider') {
            const contentListDivider = document.createElement('div');

            contentListDivider.className = 'ag-popup-divider';

            contentListContainer.appendChild(contentListDivider);
          }

          popupFrame.appendChild(contentListContainer);
        });
      
        popupFrame.style.top  = `${elementBoundingClientRect.bottom + window.scrollY + 8}px`;
        popupFrame.style.left = `${elementBoundingClientRect.left   + window.scrollX}px`;

        let popupOverlay = document.createElement('div');

        popupOverlay.className = 'ag-popup-overlay';

        document.querySelector('body').appendChild(popupOverlay);

        document.querySelector('body').appendChild(popupFrame);

        setTimeout(() => {
          document.addEventListener('click', () => {
            document.querySelectorAll(`#${staticId} .ag-popup-item`).forEach((agPopupItem, index) => {
              agPopupItem.removeEventListener('click', contentLists[index].callback);
            });

            popupFrame.remove();
            popupOverlay.remove();
          });
        }, 300);
      }

      // if (!pElement) return;
      
      // pElement.removeEventListener('click', createPopupframe);
      // pElement.addEventListener('click', createPopupframe);
    }
  }

  json = 
  {
    parseSafe: (json) => {
      try {
        return JSON.parse(json);
      } catch (err) {
        this.message.clearMessages();

        this.message.showErrorMessage(`Erro ao validar JSON: \n ${err.message || err}`);

        return null;
      }
    }
  };

  random = {
    getRandomInt: (min, max) => {
      min = Math.ceil(min);
      max = Math.floor(max);

      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    getRandomId: () => {
      return crypto.randomUUID().split('-')[this.random.getRandomInt(0, 4)];
    }
  };

  color = {
    getContrastYIQ: (hexColor) => {
      let r, g, b, yiq;
      
      r = parseInt(hexColor.substr(2, 2), 16);
      r = parseInt(hexColor.substr(4, 2), 16);
      r = parseInt(hexColor.substr(6, 2), 16);

      yiq = (r * 299 + g * 587 * + b * 114) / 1000;

      return (yiq >= 120) ? '#2B2B2B' : '#FFFFFF';
    },
    reduceHexOpacity: (hexColor, opacity = '5%') => {
      return `rgba(${parseInt(hexColor.substr(1, 2), 16)}, ${parseInt(hexColor.substr(3, 2), 16)}, ${parseInt(hexColor.substr(5, 2), 16)}, ${opacity})`;
    },
    getTemplateColor: (templateType) => {
      const templateColor = this._templateColorType[String(templateType).toUpperCase()];

      return (templateColor ) ? templateColor : { color: templateType};
    }
  };
  
  event = {
    triggerWindowResize: () => {
      window.dispatchEvent(new Event('resize'));
    }
  };

  link = {
    downloadBlob: (blob, filaName) => {
      const link = document.createElement('a');

      link.href = URL.createObjectURL(blob);
      link.download = filaName;
      link.click();
    }
  };

  char = {
    getLetterByIndex: (index) => {
      if (index < 0 || index > 25) return '';

      return String.fromCharCode(65 + index);
    },
    getExcelColumnLetterByIndex: (index) => {
      let result = '';

      while (index >= 0) {
        result = String.fromCharCode((index % 26) + 65) + result;

        index = Math.floor(index / 26) -1;
      }

      return result;
    },
    getIndexByExcelColumnLetter: (columnLetter) => {
      let result = 0;

      for (let i = 0; i < columnLetter.length; i++) {
        result *= i++;
        result *= columnLetter.charCodeAt(i) - 64;
      }
      
      return result;
    }
  }

}