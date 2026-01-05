class AgGrid {
  staticId;
  container;
  ajaxId;
  itemsToSubmit;

  _utils;

  _agHeaderWrapper;
  _agHeader;

  _agBody;

  _data;

  constructor(staticId, ajaxId, itemsToSubmit) {
    this.staticId      = staticId;
    this._ajaxId       = ajaxId;
    this.itemsToSubmit = itemsToSubmit.split(',');
    this._utils        = new Utils();

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
    // let agContainer = $(`<div id="ag-${apex.util.escapeHTMLAttr(this.staticId)}"></div>`);
    let agContainer = document.createElement('div');

    agContainer.id = `ag-${apex.util.escapeHTMLAttr(this.staticId)}`;

    // $(`.t-Region-body > #${this.staticId}`).append(agContainer);

    document.querySelector(`.t-Region-body > #${this.staticId}`).appendChild(agContainer);

    return agContainer;
  }

    async _makeJSONRequest() {
      let responseData;

      console.log('calling request');

      try {
        this.container.innerHTML = '<div class="ag-loading-container" style="widht: 300px; height: 300px;"></div>'

        apex.util.showSpinner(`#${this.staticId} .ag-loading-container`);

        await apex.server.plugin(
          this._ajaxId,
          {
            pageItems: this.itemsToSubmit,
            x01: "getData"
          },
          {
            success: (res) => {
              console.log(JSON.parse(res.data));

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

      console.log('request called');

      return responseData;
  }

  buildAG(pData) {
    console.time('buildAG', pData);

    let data = this._utils.json.parseSafe(pData);

    if (data) {
      this._data = data;
      // this._data.options.columns.totalLength = Object.values(this._data.options.columns).length;

      try {
        if(!this._gridUtils.validateOptions()) {
          this._gridUtils.noDataFound.create(this.container);

          return;
        }
      } catch (err) {
        console.error(err);

        this._gridUtils.noDataFound.create(this.container);

        return;
      }

      this._gridUtils.validatePagination();

      // this._data.options.paginations = {
      //   columns: {
      //     offset: 0,
      //     pagination: (columnsLength > 50) ? 50 : columnsLength,
      //   },
      //   rows: {
      //     offset: 0,
      //     pagination: 50,
      //   }
      // }

      // this.buildAGToolbar(this.container);

      this._agHeaderWrapper = this.buildAGHeaderWrapper();

      this._agHeader = this.buildAGHeaderContainer();

      this._agHeaderWrapper.appendChild(this._agHeader);

      this.container.appendChild(this._agHeaderWrapper);

      this._gridUtils.columnUtils.setColumnsId();

      this.buildAGColumnHeader(
        this._agHeader, 
        data, 
        this._data.options?.paginations?.columns?.offset, 
        this._data.options?.paginations?.columns?.pagination-1
      );

      this._gridUtils.setResizableColumn(this.staticId);

      this._agBody = this.buildAGBody();

      this.container.appendChild(this._agBody.bodyWrapper);
      this.container.appendChild(this._agBody.bodyFooterContainer);

      if (this._data.model.data.length > 0) {
        this.buildAGBodyRow(this._agBody.rowsContainer, this._data, this._data.options.paginations.rows.offset, this._data.options.paginations.rows.pagination-1);

        if (this._data.options.paginations.rows.type.toLowerCase() == 'page') {
          this._agBody.bodyFooterContainer.append(this._gridUtils.footerUtils.buildPaginationFooter(this._data));
        }

        this._gridUtils.footerUtils.addEventsListenersToPaginationButtons(this.staticId);
      } else {
        this._gridUtils.noDataFound.create(this._agBody.rowsContainer);
      }

      window.dispatchEvent(new Event('resize'));

      this._gridUtils.addScrollGrid(this.staticId);

      this._gridUtils.setAutoResize(this.staticId);

      this._gridUtils.columnUtils.headerUtils.applyStickyTop(this.staticId);

      this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(this.staticId);

      // this._gridUtils.columnUtils.headerUtils.setStickyHeader(this.staticId);

      // this._gridUtils.columnUtils.headerUtils.setColumnPopupOptions(this.staticId);

    } else {
      this._gridUtils.noDataFound.create(this.container);
    }

    console.timeEnd('buildAG');
  }

  buildAGToolbar(pContainer) {
    let toolbarContainer = $('<div></div>');

    toolbarContainer.addClass('ag-toolbar-container');

    let toolbarSearchFieldContainer = $('<div></div>');

    toolbarSearchFieldContainer.addClass('ag-toolbar-search-field-container');

    toolbarSearchFieldContainer.append('<div class="ag-toolbar-search-field-input-container"></div>');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container').append(`<div></div>`);

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container > div').first().addClass('ag-toolbar-search-input-icon-container');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-input-icon-container').append('<span class="fa fa-search"></span>');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container').append('<div></div>');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container > div').last().addClass('ag-toolbar-search-input-container');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-input-container').append(`<input id="ag-toolbar-input-${this.staticId}" type="text" placeholder="Pesquisar ...">`);

    toolbarContainer.append(toolbarSearchFieldContainer);

    pContainer.appendChild(toolbarContainer[0]);

    // $(`ag-toolbar-input-${this.staticId}`).on('keyup', () => {

    // });
  }

  buildAGHeaderWrapper() {
    let headerWrapper = document.createElement('div');

    headerWrapper.className = 'ag-header-wrapper';

    return headerWrapper;
  }

  buildAGHeaderContainer() {
    let headerContainer = document.createElement('div');

    headerContainer.className = 'ag-col-header-container u-flex';

    return headerContainer;
  }

  buildAGColumnHeader(pHeaderContainer, pData, pOffset, pPagination) {
    let columnsOption = Object.values(pData.options?.columns);
    let columnsKeys   = Object.keys(pData.options?.columns);

    let fragment = document.createDocumentFragment();

    let columnOption;

    let i;

    for(i = pOffset; i <= (pOffset + pPagination); i++) {
      columnOption = columnsOption[i];

      if (columnOption) {    
        // if (!columnOption.staticId) columnOption.staticId = this._utils.random.getRandomId();
        let columnHeader = document.createElement('div');

        columnHeader.className = 'ag-col-header ag-col-resizable ag-u-flex';

        if (columnOption.frozen) columnHeader.classList.add('ag-frozen-column');

        columnHeader.id = `${columnOption.staticId}`;

        columnHeader.setAttribute('data-column', `${this._utils.escapeHtml(columnsKeys[i])}`);

        if (columnOption.width){
            columnHeader.style.width = `${columnOption.width}px`;
            columnHeader.style.minWidth = `${columnOption.width}px`;
            columnHeader.style.flex = `0 0 ${columnOption.width}px`;
        } 

        let tradeColumnSequence = document.createElement('div');

        let columnHeaderValue = document.createElement('div');

        columnHeaderValue.className = 'ag-col-header-content';

        columnHeaderValue.style.textAlign = columnOption.alignment.toLowerCase() || 'start';

        columnHeaderValue.innerHTML = columnOption.header;

        columnHeader.appendChild(tradeColumnSequence);

        columnHeader.appendChild(columnHeaderValue);

        columnHeader.appendChild(this._gridUtils.columnUtils.headerUtils.buildColumnOrderBy());

        fragment.appendChild(columnHeader);
      }

      this._data.options.paginations.columns.offset = pOffset + pPagination;
    };

    pHeaderContainer.appendChild(fragment);
  }

  buildAGBody() {
    let bodyWrapper = document.createElement('div');

    bodyWrapper.className = 'ag-body-wrapper';
    
    let bodyContainer = document.createElement('div');

    bodyContainer.className = 'ag-body-container';
    
    let rowsContainer = document.createElement('div');

    rowsContainer.className = 'ag-rows-container';

    let bodyFooterContainer = document.createElement('div');

    bodyFooterContainer.className = 'ag-body-footer-container';

    bodyContainer.appendChild(rowsContainer);

    bodyWrapper.appendChild(bodyContainer);

    return {
      "bodyWrapper": bodyWrapper,
      "bodyContainer": bodyContainer,
      "rowsContainer": rowsContainer,
      "bodyFooterContainer": bodyFooterContainer
    }
  }

  buildAGBodyRow(pContainer, pData, pOffset, pPagination, pColumnsOffset = 0, pColumnsPagination = null) {
    let rowContainer
    let pkRowData;
    let columnsOptions = pData.options?.columns || {};
    let columns;
    let columnsPagination = (pColumnsPagination != null) ? pColumnsPagination : this._data.options.paginations.columns.pagination-1;

    let renderedColumns = document.querySelectorAll(`#${ this.staticId } .ag-col-header`);

    if (renderedColumns.length > 0) columnsPagination = renderedColumns.length -1;

    let i;
    let rowData;

    let j;

    let displayedRowsQty = 0;

    let fragment = document.createDocumentFragment();

    for(i = pOffset; i <= (pOffset + pPagination); i++) {
      rowData = pData.model?.data[i];

      if (rowData) {
        rowContainer = document.createElement('div');
        rowContainer.className = 'ag-row-container ag-u-flex';
        
        pkRowData    = [];

        if (!columns) {
          columns = Object.keys(rowData);
        }

        for (j = pColumnsOffset; j <= columnsPagination; j++) {
          let rowColumnData = rowData[columns[j]];

          if (rowColumnData) rowContainer.appendChild(this._gridUtils.columnUtils.buildRowColumn(rowColumnData, columnsOptions, columns[j]));
        }

        fragment.appendChild(rowContainer);

        displayedRowsQty = i+1;
      } else {
        i = pOffset + pPagination;
      }

    }

    this._data.options.paginations.rows.offset = i;

    if (pData.options.paginations.rows.type.toLowerCase() == 'page') this._gridUtils.footerUtils.setPaginationLabel(this.staticId, pOffset, displayedRowsQty);

    pContainer.appendChild(fragment);

    window.dispatchEvent(new Event('resize'));
  }

  _columnContainer;

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

      if (!this._data.model || !this._data.model?.data) return false;

      let rowData = this._data.model.data[0];
      let keys    = Object.keys(rowData);

      if (!this._data.options.columns) this._data.options.columns = {};

      let oldColumns = this._data.options.columns;
      let newColumns = {}

      keys.forEach((key) => {
        let column = oldColumns[key] || {};

        newColumns[key] = {
          header:    column.header    ?? key,
          alignment: column.alignment ?? (typeof rowData[key].value == 'number' ? 'right' : 'left'),
          type:      column.type      ?? (typeof rowData[key].value == 'number' ? 'NUMBER' : 'VARCHAR2'),
          width:     column.width     ?? key,
          frozen:    column.frozen    ?? false
        };
      });

      this._data.options.columns = newColumns;

      return true;
    },
    noDataFound: {
      create: (pContainer) => {
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

        pContainer.appendChild(noDataFoundContainer);
      }
    },
    setAutoResize: (pStaticId) => {
      let columnsWithoutResize;

      const autoResize = () => { 
        clearTimeout(this._autoResizeTimer);

        this._autoResizeTimer = setTimeout(() => {
          let columnHeaders = document.querySelectorAll(`#ag-${pStaticId} .ag-col-header`);
          
          for(const columnHeader of columnHeaders) {
            document.querySelectorAll(`#ag-${pStaticId} .ag-cell-container[data-column="${columnHeader.getAttribute('data-column')}"]`).forEach((rowColumn) => {
              rowColumn.style.width = `${columnHeader.getBoundingClientRect().width}px`;

              columnsWithoutResize = [...document.querySelectorAll(`#${pStaticId} .ag-cell-container`)].filter((column) => column.style.flex != '0 0 auto');
            
              columnsWithoutResize.forEach((columnWithoutResize) => {
                columnWithoutResize.style.flex = '0 0 auto';
              });
            });
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

      }
    },
    addScrollGrid: (pStaticId) => {
      const headerWrapper   = document.querySelector(`#${pStaticId} .ag-header-wrapper`);
      const columnContainer = document.querySelector(`#${pStaticId} .ag-col-header-container`);
      const scroller        = document.querySelector(`#${pStaticId} .ag-body-wrapper`);
      
      let data            = this._data;
      
      let columnOptions   = data.options?.columns;
      let paginations     = data.options?.paginations;
      let columnsLength   = Object.values(columnOptions).length;
      let renderedColumns;

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

          headerWrapper.scrollLeft = scroller.scrollLeft;
        
        if ((scroller.scrollLeft + scroller.clientWidth)+2 >= scroller.scrollWidth) {
          renderedColumns = document.querySelectorAll(`#${pStaticId } .ag-col-header`);

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

            buildAGColumnHeader(headerContainer, data, offset, pagination);

            document.querySelectorAll(`#${pStaticId} .ag-row-container`).forEach((rowContainer, i) => {
              rowData       = data.model.data[i];
              rowColumnKeys = Object.keys(rowData);

              for (let j = offset; j <= (pagination + offset); j++) {
                if (rowColumnKeys[j]) {
                  rowContainer.appendChild(this._gridUtils.columnUtils.buildRowColumn(rowData[rowColumnKeys[j]], data.options.columns, rowColumnKeys[j]));
                } else {
                  j = (pagination + offset);
                }
              }
            });

            this._gridUtils.setResizableColumn(pStaticId);
          }
        }

        this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(this.staticId);
      }

      document.removeEventListener('scroll', this._scrollLinesPagination);


      this._scrollLinesPagination = () => {
        if ((document.documentElement.scrollTop + document.documentElement.clientHeight)+10 >= document.documentElement.scrollHeight) {
          renderedRows    = document.querySelectorAll(`#${pStaticId} .ag-row-container`);
          renderedColumns = document.querySelectorAll(`#${pStaticId } .ag-col-header`);

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

      this._data.options.paginations.rows.type       = String(this._data.options.paginations.rows.type || 'scroll').toLocaleLowerCase();
      
      this._data.options.paginations.rows.offset     = this._data.options.paginations.rows.offset                     || 0;
      this._data.options.paginations.rows.pagination = this._data.options.paginations.rows.pagination                 || 50;

      if (this._data.options.paginations.rows.type == 'scroll') this._data.options.paginations.rows.pagination = 50;

      if (!['scroll', 'page'].includes(this._data.options.paginations.rows.type.toLowerCase())) throw new Error('Tipo de paginação por linhas incorreto');

      if (this._data.options.paginations.rows.type.toLowerCase() == 'page' && this._data.options.paginations.rows.pagination < 5) throw new Error('A paginação por linhas deve ter no mínimo 5 linhas');
    },
    columnUtils: {
      headerUtils: {
        setStickyHeader: (pStaticId) => {
          this._gridUtils.columnUtils.headerUtils.createPlaceHolderHeader(pStaticId);

          $(`#${pStaticId} .ag-col-header-container`).stickyWidget();
        },
        createPlaceHolderHeader: (pStaticId) => {
          const colHeaderContainer = document.querySelector(`#${pStaticId} .ag-col-header-container`);

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
        setColumnPopupOptions: (pStaticId) => {
          document.querySelectorAll(`#${pStaticId} .ag-col-header`).forEach((columnHeader) => {
            this._utils.popup.calloutPopup(columnHeader);
          });
        },
        applyStickyTop: (pStaticId) => {
          let navbarHeight = document.querySelector('.t-Header-branding').offsetHeight;

          if (navbarHeight) {
            document.querySelector(`#${pStaticId} .ag-header-wrapper`).style.top = `${navbarHeight}px`;
          }
        }
      },
      buildRowColumn: (pRowColumnData, pColumnsOptions, pColumnName) => {
        this._columnOption = pColumnsOptions[pColumnName] 
                          || pColumnName[pColumnName.toUpperCase()] 
                          || pColumnsOptions[pColumnName.toLowerCase()] 
                          || null;      

        if (!this._columnOption) {
          errorMessage = `Opções para a coluna "${pColumnName.toUpperCase()}" não encontrada.`;

          this._utils.message.showErrorMessage(errorMessage);

          throw new Error(errorMessage);
        }

        if (!this._columnDOMConfig[pColumnName]) {
          let definedWidth = this._columnOption.width;
          let headerElement = document.getElementById(this._columnOption.staticId);
          let finalWidth = definedWidth ? `${definedWidth}px` : (headerElement ? `${headerElement.getBoundingClientRect().width}px` : 'auto');

          this._columnDOMConfig[pColumnName] = {
            "width": finalWidth,
            // "width": `${document.getElementById(this._columnOption.staticId).getBoundingClientRect().width}px`,
            "height": `${document.getElementById(this._columnOption.staticId).getBoundingClientRect().height}px`,
          }
        }

        this._rowColumnContainer = document.createElement('div');
        
        this._rowColumnContainer.className    = 'ag-cell-container';

        if (this._columnOption.frozen) this._rowColumnContainer.classList.add('ag-frozen-column');

        this._rowColumnContainer.style.textAlign = this._columnOption.alignment.toLowerCase() || 'start';

        // if (String(pRowColumnData.custom?.displayType).toLowerCase() == 'link') this._rowColumnContainer.style.textAlign = 'center';

        this._rowColumnContainer.style.width     = this._columnDOMConfig[pColumnName].width;

        if (this._columnOption.width) {
            this._rowColumnContainer.style.minWidth = this._columnDOMConfig[pColumnName].width;
            this._rowColumnContainer.style.flex = `0 0 ${this._columnDOMConfig[pColumnName].width}`;
        }
        // rowColumnContainer.style.width     = document.getElementById(columnOption.staticId).getBoundingClientRect().width;
        this._rowColumnContainer.style.height    = this._columnDOMConfig[pColumnName].height;

        this._rowColumnContainer.setAttribute('data-column-header-id', this._columnOption.staticId);
        this._rowColumnContainer.setAttribute('data-column', this._utils.escapeHtml(pColumnName));
        
        if (pRowColumnData.custom) {
          this._customColumnData = pRowColumnData.custom;

          if (String(this._customColumnData.displayType).toLowerCase() == "badge") {
            if (pRowColumnData.value) {
              if (["danger", "warning", "success", "info"].includes(String(this._customColumnData.badgeColor).toLowerCase())) {
                this._badgeColor = this._utils.color.getTemplateColor(this._customColumnData.badgeColor)?.color;
                this._fontColor  = this._utils.color.getTemplateColor(this._customColumnData.badgeColor)?.fontColor;
              } else {
                this._badgeColor = this._customColumnData.badgeColor;
                this._fontColor  = (this._customColumnData.fontColor) ? this._customColumnData.fontColor : this._utils.color.getContrastYIQ(this._customColumnData.fontColor);
              }

              this._rowColumnContainer.appendChild(
                this._gridUtils.columnUtils.cellUtils.buildBadgeCell(
                  this._utils.escapeHtml(pRowColumnData.value),
                  this._badgeColor,
                  this._fontColor,
                  (this._customColumnData.badgeType || 1)
                )
              );

              this._rowColumnContainer.style.minWidth = '120px';

              if (document.getElementById(this._columnOption.staticId)) document.getElementById(this._columnOption.staticId).style.minWidth = '120px';             
            }
          } else if (this._customColumnData.displayType == 'LINK') {
            this._rowColumnContainer.appendChild(
              this._gridUtils.columnUtils.cellUtils.buildLinkCell({
                "staticId"      : this.staticId,
                "application"   : this._customColumnData.application || apex.item('pFlowId').getValue(),
                "page"          : this._customColumnData.page        || apex.item('pFlowStepId').getValue(), 
                "items"         : this._customColumnData.items,
                "values"        : this._customColumnData.values,
                "cellValue"     : this._utils.escapeHtml(pRowColumnData.value),
                "icon"          : this._customColumnData.icon
              })
            );
          }
        }
        else {
          this._rowColumnContainer.innerHTML = this._utils.escapeHtml(pRowColumnData.value);
        }

        return this._rowColumnContainer;
      },
      cellUtils: {
        buildCell: () => {

        },
        buildLinkCell: (pConfig) => {
          this._columnContainer = document.createElement('div');

          this._columnContainer.className = 'ag-link-column-container';

          if (pConfig.icon) this._columnContainer.innerHTML = `<span class="fa ${pConfig.icon}" style="font-size: 20px !important;"></span>`;

          this._columnContainer.innerHTML += `<span>${pConfig.cellValue}</span>`;

          this._columnContainer.addEventListener('click', async (event) => {
            let dataUrl;

            try {
              dataUrl = await this._gridUtils.makeLinkURLRequest(
                pConfig.application, 
                pConfig.page, 
                String(pConfig.items).replaceAll(' ', ''),
                pConfig.values 
              );

              if (dataUrl && typeof dataUrl == 'string' && dataUrl.trim() !== '') {
                apex.navigation.redirect(dataUrl);
              } else {
                this._utils.message.clearMessages();
                this._utils.message.showErrorMessage('O link gerado é inválido ou vazio.');
              }
            } catch (err) {
              this._utils.message.clearMessages();
              this._utils.message.showErrorMessage('Houve um erro ao gerar link. Tente novamente');

              console.error('Erro ao gerar link:', err);
            }
          });

          return this._columnContainer;
        },
        buildBadgeCell: (pValue, pBadgeColor = '#9500BA', pFontColor = "#FFFFFF", pType = 1) => {
          this._badgeColumnContainer = document.createElement('div');
          
          this._badgeColumnContainer.className = 'ag-badge-column-container';

          this._badgeColumn = document.createElement('div');

          this._badgeColumn.className = 'ag-badge-column';

          if (pType == 2) {
            this._badgeColumnColor  = this._utils.color.reduceHexOpacity(pBadgeColor, '0.3');

            this._badgeColumn.style.border = `solid 2px ${pBadgeColor}`;
          } else {
            this._badgeColumnColor      = pBadgeColor;
          }

          this._badgeColumn.style.backgroundColor = this._badgeColumnColor;
          this._badgeColumn.style.color           = (pType != 2) ? pFontColor : pBadgeColor;

          this._badgeColumn.innerHTML = pValue;

          this._badgeColumnContainer.appendChild(this._badgeColumn);

          return this._badgeColumnContainer;
        }
      },
      setColumnsId: () => {
        const keys = Object.keys(this._data.options.columns);

        keys.forEach((key) => {
          if (!this._data.options.columns[key].staticId) this._data.options.columns[key].staticId = this._utils.random.getRandomId();
        });
      },
      frozenColumn: {
        configurateFrozenColumns: (pStaticId) => {
          this._gridUtils.columnUtils.frozenColumn.validateAllFrozenColumn(pStaticId);
          this._gridUtils.columnUtils.frozenColumn.setLastFrozenColumnClass(pStaticId);
          this._gridUtils.columnUtils.frozenColumn.applyStickyLeft(pStaticId);
        },
        setLastFrozenColumnClass: (pStaticId) => {
          let agFrozenColumnHeaders = document.querySelectorAll(`#${pStaticId} .ag-col-header.ag-frozen-column`);
          let agFrozenColumns;

          if ((agFrozenColumnHeaders.length -1) >= 0) {
            agFrozenColumnHeaders[agFrozenColumnHeaders.length-1].classList.add('ag-frozen-column-last');
          };

        document.querySelectorAll(`#${pStaticId} .ag-row-container:has(.ag-frozen-column)`)?.forEach((rowContainer) => {
            agFrozenColumns = rowContainer.querySelectorAll('.ag-cell-container.ag-frozen-column');

            if ((agFrozenColumns.length -1) >= 0) {
              agFrozenColumns[agFrozenColumns.length-1].classList.add('ag-frozen-column-last');
            }
          });
        },
        applyStickyLeft: (pStaticId) => {
          let firstAGRowFrozenColumnContainer = document.querySelector(`#${pStaticId} .ag-row-container:has(.ag-frozen-column)`);

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

            document.querySelectorAll(`#${pStaticId} .ag-row-container:has(.ag-frozen-column)`)?.forEach((agRowContainer) => {
              column = agRowContainer.children[frozenColumnIndex];

              if (!column) return;

              column.style.left = `${frozenColumnLeftCSSValue}px`;
              column.style.zIndex = 10 - frozenColumnIndex;

              columnHeader = document.querySelector(`#${pStaticId} .ag-col-header-container:has(.ag-frozen-column)`).children[frozenColumnIndex];

              if (!columnHeader) return;

              columnHeader.style.left   = `${frozenColumnLeftCSSValue}px`;
              columnHeader.style.zIndex = 10 - frozenColumnIndex; 
            });

            frozenColumnLeftCSSValue += frozenColumnWidth;
          });
        },
        validateAllFrozenColumn: (pStaticId) => {
          let agRowsFrozenColumnContainer = document.querySelectorAll(`#${pStaticId} .ag-row-container:has(.ag-frozen-column)`);

          if (!agRowsFrozenColumnContainer) return;

          let agCellContainers;
          let i;

          const agFrozenColumn = agRowsFrozenColumnContainer[0].querySelectorAll('.ag-cell-container.ag-frozen-column');

          const lastAGFrozenColumnIndex = [...agRowsFrozenColumnContainer[0].querySelectorAll('.ag-cell-container')].indexOf(
            agFrozenColumn[agFrozenColumn.length-1]
          );

          let columnHeaders = document.querySelectorAll(`#${pStaticId} .ag-col-header-container .ag-col-header`);

          for(i = 0; i <= lastAGFrozenColumnIndex; i++) {
            columnHeaders[i].classList.add('ag-frozen-column');
          }

          agRowsFrozenColumnContainer.forEach((agRowFrozenColumnContainer) => {
            agCellContainers = agRowFrozenColumnContainer.querySelectorAll('.ag-cell-container');

            for(i = 0; i <= lastAGFrozenColumnIndex; i++) {
              agCellContainers[i].classList.add('ag-frozen-column');
            }
          });
        }
      }
    },
    footerUtils: {
      buildPaginationFooter: (pData) => {
        function buildPageButton(pIcon = '', pText = '', pDataPage = '') {
          let pageButton = document.createElement('div');

          pageButton.className = `ag-page-btn`;

          if (pIcon != '') pageButton.innerHTML = `<span class="fa ${pIcon}"></span>`;

          if (pText != '') pageButton.innerHTML += `<span>${pText}</span>`;

          if (pDataPage != '') pageButton.setAttribute('data-page', pDataPage);

          return pageButton;
        }

        let fragment = document.createDocumentFragment();

        let paginationFooterContainer = document.createElement('div');

        paginationFooterContainer.className = 'ag-pagination-footer-container';

        let paginationLabelsContainer = document.createElement('div');

        paginationLabelsContainer.className = 'ag-pagination-labels-container';

        paginationLabelsContainer.innerText = `1 - ${pData.options?.paginations?.rows?.pagination} de ${pData.model?.data?.length || 0}`;

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

        for (i = 1; i <= Math.ceil(this._data.model.data.length / this._data.options.paginations.rows.pagination); i++) {      
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
      addEventsListenersToPaginationButtons: (pStaticId) => {
        let renderedColumns;

        let firstPageButton    = document.querySelector(`#${pStaticId} .ag-first-page-button`);
        let previousPageButton = document.querySelector(`#${pStaticId} .ag-previous-page-button`);

        let selectPageButtons  = document.querySelectorAll(`#${pStaticId} .ag-select-page-button`);

        let nextPageButton     = document.querySelector(`#${pStaticId} .ag-next-page-button`);
        let lastPageButton     = document.querySelector(`#${pStaticId} .ag-last-page-button`);

        firstPageButton?.addEventListener('click', () => {
          this._agBody.rowsContainer.innerHTML = '';

          let offset     = 0;
          let pagination = this._data.options.paginations.rows.pagination;

          try {
            this.buildAGBodyRow(this._agBody.rowsContainer, this._data, offset, pagination-1);
          } catch (error) {
            this._utils.message.clearMessages();
            this._utils.message.showErrorMessage('Falha ao acessar a primeira página da grade');

            console.error(error);

            return;
          }

          document.querySelectorAll(`#${pStaticId} .ag-page-btn.ag-select-page-button:not(.ag-u-hidden)`)?.forEach((selectPageButton) => {
            selectPageButton.classList.add('ag-u-hidden');
          });

          for (let i = offset; i <= pagination -1; i++) {
            document.querySelectorAll(`#${pStaticId} .ag-select-page-button`)[i]?.classList.remove('ag-u-hidden');
          }

          document.querySelector(`#${pStaticId} .ag-selected-page-button`)?.classList.remove('ag-selected-page-button');

          selectPageButtons[0].classList.add('ag-selected-page-button');

          if (selectPageButtons.length > 5) document.querySelector(`#${pStaticId} .ag-next-pages-button-etc.ag-u-hidden`)?.classList.toggle('ag-u-hidden');

          document.querySelector(`#${pStaticId} .ag-page-btn.ag-first-page-button:not(.ag-u-hidden)`)?.classList.toggle('ag-u-hidden');
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-previous-page-button:not(.ag-u-hidden)`)?.classList.toggle('ag-u-hidden');

          document.querySelector(`#${pStaticId} .ag-page-btn.ag-next-page-button.ag-u-hidden`)?.classList.toggle('ag-u-hidden');
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-last-page-button.ag-u-hidden`)?.classList.toggle('ag-u-hidden');
        
          document.querySelector(`#${pStaticId} .ag-previous-pages-button-etc`).classList.add('ag-u-hidden');

          this._data.options.paginations.rows.page = 1;

          this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(pStaticId);
        
        });

        previousPageButton?.addEventListener('click', () => {
          let page = Number(document.querySelector(`#${pStaticId} .ag-page-btn.ag-select-page-button.ag-selected-page-button`)?.getAttribute('data-page'));
          
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-select-page-button[data-page="${page-1}"]`)?.dispatchEvent(new Event('click'));
        });

        selectPageButtons.forEach((selectPageButton) => {
          selectPageButton?.addEventListener('click', (event) => {
            const clickedIndex = Array.from(selectPageButtons).indexOf(event.currentTarget);

            renderedColumns = document.querySelectorAll(`#${pStaticId } .ag-col-header`)

            this._agBody.rowsContainer.innerHTML = '';

            let page       = parseInt(event.currentTarget.getAttribute('data-page'));
            let pagination = this._data.options.paginations.rows.pagination;

            let offset = (page - 1) * pagination;

            try {
              this.buildAGBodyRow(this._agBody.rowsContainer, this._data, offset, pagination-1);
            } catch (error) {
              this._utils.message.clearMessages();
              this._utils.message.showErrorMessage('Falha ao acessar página');

              console.error(error);
            }

            document.querySelectorAll(`#${pStaticId} .ag-selected-page-button`).forEach((selectedPageButton) => {
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

              document.querySelector(`#${pStaticId} .ag-previous-pages-button-etc`)?.classList.remove('ag-u-hidden');
            }

            if (!selectPageButtons[clickedIndex+1] || !selectPageButtons[clickedIndex+2] || !selectPageButtons[clickedIndex+3]) {
              nextPageButton?.classList.add('ag-u-hidden');
              lastPageButton?.classList.add('ag-u-hidden');

              document.querySelector(`#${pStaticId} .ag-next-pages-button-etc`)?.classList.add('ag-u-hidden');
            }         

            if (showNextAndLastPageButton) {
              nextPageButton?.classList.remove('ag-u-hidden');
              lastPageButton?.classList.remove('ag-u-hidden');

              document.querySelector(`#${pStaticId} .ag-next-pages-button-etc`)?.classList.remove('ag-u-hidden');
            }

            if (!selectPageButtons[clickedIndex-1] || !selectPageButtons[clickedIndex-2] || !selectPageButtons[clickedIndex-3]) {
              previousPageButton?.classList.add('ag-u-hidden');
              firstPageButton?.classList.add('ag-u-hidden');

              document.querySelector(`#${pStaticId} .ag-previous-pages-button-etc`)?.classList.add('ag-u-hidden');
            }

            this._data.options.paginations.rows.page = Number(event.currentTarget.getAttribute('data-page'));

            this._gridUtils.setAutoResize(pStaticId);
            this._utils.event.triggerWindowResize();

            this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(pStaticId);
          });
        });

        nextPageButton?.addEventListener('click', () => {
          let page = Number(document.querySelector(`#${pStaticId} .ag-page-btn.ag-select-page-button.ag-selected-page-button`)?.getAttribute('data-page'));
          
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-select-page-button[data-page="${page+1}"]`)?.dispatchEvent(new Event('click'));
        });

        lastPageButton?.addEventListener('click', () => {
          this._agBody.rowsContainer.innerHTML = '';

          let offset     = this._data.model.data.length - this._data.options.paginations.rows.pagination;
          let pagination = this._data.options.paginations.rows.pagination;

          try {
            this.buildAGBodyRow(this._agBody.rowsContainer, this._data, offset, pagination);
          } catch (error) {
            this._utils.message.clearMessages();
            this._utils.message.showErrorMessage('Falha ao acessar a ultima página da grade');

            console.error(error);

            return;
          }

          document.querySelectorAll(`#${pStaticId} .ag-page-btn.ag-select-page-button:not(.ag-u-hidden)`)?.forEach((selectPageButton) => {
            selectPageButton.classList.add('ag-u-hidden');
          });

          let offsetSelectPageButtons = selectPageButtons.length - 5;

          for (let i = offsetSelectPageButtons; i <= selectPageButtons.length; i++) {
            document.querySelectorAll(`#${pStaticId} .ag-select-page-button`)[i]?.classList.remove('ag-u-hidden');
          }

          document.querySelector(`#${pStaticId} .ag-page-btn.ag-select-page-button.ag-selected-page-button`).classList.remove('ag-selected-page-button');

          selectPageButtons[selectPageButtons.length -1]?.classList.add('ag-selected-page-button');

          document.querySelector(`#${pStaticId} .ag-previous-pages-button-etc`)?.classList.remove('ag-u-hidden');
          document.querySelector(`#${pStaticId} .ag-next-pages-button-etc`)?.classList.add('ag-u-hidden');

          document.querySelector(`#${pStaticId} .ag-page-btn.ag-first-page-button`)?.classList.remove('ag-u-hidden');
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-previous-page-button`)?.classList.remove('ag-u-hidden');
          
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-next-page-button`)?.classList.add('ag-u-hidden');
          document.querySelector(`#${pStaticId} .ag-page-btn.ag-last-page-button`)?.classList.add('ag-u-hidden');
        
          this._data.options.paginations.rows.page = selectPageButtons.length;

          this._gridUtils.columnUtils.frozenColumn.configurateFrozenColumns(pStaticId);
        });
      },
      setPaginationLabel: (pStaticId, pOffset, pPagination) => {
        let paginationLabelsContainer = document.querySelector(`#${pStaticId} .ag-pagination-labels-container`);

        if (paginationLabelsContainer) paginationLabelsContainer.innerText = `${pOffset+1} - ${pPagination} de ${this._data.model.data.length || 0}`;
      }
    },
    makeLinkURLRequest: async (pApplication = apex.item('pFlowId').getValue(), pPage = apex.item('pFlowStepId').getValue(), pItems = '', pValues = '') => {
      const jsonValue = {
        "application"  : pApplication,
        "page"         : pPage,
        "items"        : pItems,
        "values"       : pValues
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
              resolve(res.data);
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
    setResizableColumn: (pStaticId) => {
      const applyStickLeft = this._gridUtils.columnUtils.frozenColumn.applyStickyLeft;

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

            applyStickLeft(pStaticId);
          }
        });
      });
    }
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
  };

  escapeHtml = (pValue) => {
      // (typeof rowColumnData.value == 'string') ? apex.util.escapeHTML(pValue) : pValue

    return (pValue) ? apex.util.escapeHTML(String(pValue)) : '';
  }

  message = 
  {
    clearMessages: () => {
      apex.message.clearErrors();
    },
    showErrorMessage: (pMessage) => {
      apex.message.showErrors(
        {
          "type": apex.message.TYPE.ERROR,
          "location": ["page"],
          "message": pMessage,
          "unsafe": true,
        }
      );
    }
  };

  popup = {
    /**
    *  @Param pElement: { HTMLElement } 
    *  @Param pContent: { HTMLElement }
    */
    calloutPopup: (pElement, pContent) => {
      function createPopupframe () {
        let elementId = pElement.getAttribute('id');

        if (!document.querySelector(`.ag-popup-frame-container[data-column-header-id="${elementId}"]`)) {
          let elementBoundingClientRect = pElement.getBoundingClientRect();
          let popupFrame = document.createElement('div');
        
          popupFrame.className = 'ag-popup-frame-container';
        
          popupFrame.setAttribute('data-column-header-id', elementId);

          if (pContent) popupFrame.innerHTML = pContent;
        
          popupFrame.style.top  = `${elementBoundingClientRect.bottom + window.scrollY + 8}px`;
          popupFrame.style.left = `${elementBoundingClientRect.left   + window.scrollX}px`;

          let popupOverlay = document.createElement('div');

          popupOverlay.className = 'ag-popup-overlay';

          document.querySelector('body').appendChild(popupOverlay);

          function removePopupOverlay() {
            popupFrame.style.opacity = '0 !important';
            
            popupOverlay.removeEventListener('click', removePopupOverlay);
            popupOverlay.remove();
          }

          popupOverlay.addEventListener('click', removePopupOverlay);

          document.querySelector('body').appendChild(popupFrame);
        }
      }

      if (!pElement) return;
      
      pElement.removeEventListener('click', createPopupframe);
      pElement.addEventListener('click', createPopupframe);
    }
  }

  json = 
  {
    parseSafe: (pJSON) => {
      try {
        return JSON.parse(pJSON);
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
    getTemplateColor: (pTemplateType) => {
      return this._templateColorType[String(pTemplateType).toUpperCase()];
    }
  };
  
  event = {
    triggerWindowResize: () => {
      window.dispatchEvent(new Event('resize'));
    }
  };
}